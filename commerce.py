"""CVORA paid AI credits. Checkout is OFF unless all production secrets are set.

Anonymous purchase ownership is bound to an unguessable, HttpOnly cookie. Production
should add account recovery and persistent PostgreSQL before offering paid plans.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets
import time
import uuid
from contextlib import contextmanager
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

router = APIRouter()
PRICE_ARS = 4900
AI_CREDITS = 4  # first improvement + up to 3 follow-up revisions


def price():
    try:
        return max(500, min(100000, int(os.getenv('CVORA_PRICE_ARS', str(PRICE_ARS)))))
    except (TypeError, ValueError):
        return PRICE_ARS


def ready():
    origin = os.getenv('CVORA_PUBLIC_URL', '').rstrip('/')
    parsed = urlparse(origin)
    return bool(
        os.getenv('CVORA_ENABLE_PAYMENTS', '').lower() == 'true'
        and os.getenv('MP_ACCESS_TOKEN')
        and os.getenv('MP_WEBHOOK_SECRET')
        and os.getenv('DATABASE_URL', '').startswith(('postgres://', 'postgresql://'))
        and parsed.scheme == 'https' and parsed.netloc
        and os.getenv('CVORA_ENABLE_AI', '').lower() == 'true'
        and os.getenv('OPENAI_API_KEY')
    )


def session(request: Request):
    return getattr(request.state, 'cvora_sid', '')


def hash_sid(sid: str):
    return hashlib.sha256(sid.encode('utf-8')).hexdigest()


@contextmanager
def db():
    import psycopg
    uri = os.environ['DATABASE_URL']
    with psycopg.connect(uri, connect_timeout=5) as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS cvora_orders (
            order_id TEXT PRIMARY KEY,
            owner_hash TEXT NOT NULL,
            amount INTEGER NOT NULL,
            currency TEXT NOT NULL DEFAULT 'ARS',
            status TEXT NOT NULL DEFAULT 'pending',
            credits_used INTEGER NOT NULL DEFAULT 0,
            provider_payment_id TEXT UNIQUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )''')
        conn.execute('CREATE INDEX IF NOT EXISTS cvora_orders_owner_idx ON cvora_orders(owner_hash, status)')
        conn.commit()
        yield conn


def credit_balance(request: Request):
    if not ready() or not session(request):
        return 0
    try:
        with db() as conn:
            row = conn.execute('SELECT COALESCE(SUM(%s - credits_used),0) FROM cvora_orders WHERE owner_hash=%s AND status=%s',
                               (AI_CREDITS, hash_sid(session(request)), 'paid')).fetchone()
            return int(row[0] or 0)
    except Exception:
        return 0


def reserve_credit(request: Request):
    """Atomically reserve an AI call; rollback credit on provider errors."""
    if not ready() or not session(request):
        return None
    with db() as conn:
        row = conn.execute('''UPDATE cvora_orders SET credits_used=credits_used+1
            WHERE order_id=(SELECT order_id FROM cvora_orders
                WHERE owner_hash=%s AND status='paid' AND credits_used<%s
                ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED)
            RETURNING order_id''', (hash_sid(session(request)), AI_CREDITS)).fetchone()
        conn.commit()
        return row[0] if row else None


def refund_credit(order_id):
    if not order_id:
        return
    with db() as conn:
        conn.execute('UPDATE cvora_orders SET credits_used=GREATEST(credits_used-1,0) WHERE order_id=%s', (order_id,))
        conn.commit()


def verified_header(request: Request, payment_id: str):
    """Mercado Pago HMAC v1: id:<id>;request-id:<id>;ts:<ms>;"""
    header = request.headers.get('x-signature', '')
    req_id = request.headers.get('x-request-id', '')
    parts = dict(re.findall(r'(?:(?:^)|,)(\w+)=([^,]+)', header.replace(' ', '')))
    ts, sig = parts.get('ts', ''), parts.get('v1', '')
    if not (req_id and ts.isdigit() and len(ts) in (10, 13) and re.fullmatch('[a-f0-9]{64}', sig or '')):
        return False
    issued = int(ts) / (1000 if len(ts) == 13 else 1)
    if abs(time.time() - issued) > 600:
        return False
    # Mercado Pago documents lowercasing the ID for some notifications.
    template = f'id:{payment_id.lower()};request-id:{req_id};ts:{ts};'
    computed = hmac.new(os.environ['MP_WEBHOOK_SECRET'].encode(), template.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, sig)


def mp_get_payment(payment_id: str):
    response = httpx.get(f'https://api.mercadopago.com/v1/payments/{payment_id}',
                         headers={'Authorization': 'Bearer ' + os.environ['MP_ACCESS_TOKEN']}, timeout=12)
    response.raise_for_status()
    return response.json()


@router.get('/api/pricing')
def pricing(request: Request):
    return {'currency': 'ARS', 'price': price(), 'plan': 'CV mejorado con IA',
            'includes': '1 mejora + hasta 3 revisiones', 'credits_per_purchase': AI_CREDITS,
            'checkout_available': ready(), 'remaining_credits': credit_balance(request)}


@router.post('/api/checkout')
def checkout(request: Request):
    if not ready():
        raise HTTPException(503, 'Los pagos todavía no están habilitados. Probá la versión gratuita.')
    sid = session(request)
    if not sid:
        raise HTTPException(403, 'Recargá la página para iniciar una sesión segura.')
    origin = os.environ['CVORA_PUBLIC_URL'].rstrip('/')
    order_id = str(uuid.uuid4())
    with db() as conn:
        conn.execute('INSERT INTO cvora_orders (order_id, owner_hash, amount) VALUES (%s,%s,%s)',
                     (order_id, hash_sid(sid), price()))
        conn.commit()
    payload = {
        'items': [{'id': 'cvora-cv-ia', 'title': 'CVORA — 1 CV con IA y 3 revisiones',
                   'quantity': 1, 'unit_price': price(), 'currency_id': 'ARS'}],
        'external_reference': order_id,
        'back_urls': {k: origin + '/api/payment-return' for k in ('success', 'pending', 'failure')},
        'auto_return': 'approved',
        'notification_url': origin + '/api/mercadopago/webhook',
    }
    try:
        r = httpx.post('https://api.mercadopago.com/checkout/preferences', json=payload,
                       headers={'Authorization': 'Bearer ' + os.environ['MP_ACCESS_TOKEN'],
                                'Content-Type': 'application/json', 'X-Idempotency-Key': order_id}, timeout=15)
        r.raise_for_status()
        url = r.json().get('init_point')
        if not url or urlparse(url).scheme != 'https' or not urlparse(url).hostname.endswith(('mercadopago.com', 'mercadopago.com.ar')):
            raise ValueError('Mercado Pago no entregó una URL válida')
        return {'checkout_url': url, 'order_id': order_id}
    except Exception:
        raise HTTPException(502, 'No pudimos iniciar el cobro. Probá de nuevo; no realizamos ningún cargo.')


@router.get('/api/payment-return')
def payment_return():
    # NEVER trust success/pending URL params. Only provider verification grants credits.
    return RedirectResponse('/?pago=verificar#herramienta', status_code=303)


@router.post('/api/mercadopago/webhook')
async def webhook(request: Request):
    if not ready():
        raise HTTPException(503, 'Webhook desactivado')
    # Never process a spoofed notification even if it looks like a successful checkout.
    data = await request.json()
    if data.get('type') != 'payment':
        return {'ok': True}
    payment_id = str((data.get('data') or {}).get('id') or '')
    if not payment_id.isdigit() or not verified_header(request, payment_id):
        raise HTTPException(401, 'Firma inválida')
    try:
        payment = mp_get_payment(payment_id)
        if payment.get('status') != 'approved':
            return {'ok': True, 'paid': False}
        order_id = str(payment.get('external_reference', ''))
        if not order_id:
            return {'ok': True, 'paid': False}
        amount = payment.get('transaction_amount')
        currency = payment.get('currency_id')
        with db() as conn:
            row = conn.execute('SELECT amount,status FROM cvora_orders WHERE order_id=%s FOR UPDATE', (order_id,)).fetchone()
            if not row or row[1] != 'pending' or currency != 'ARS' or float(amount or 0) != float(row[0]):
                return {'ok': True, 'paid': False}
            conn.execute('UPDATE cvora_orders SET status=%s, provider_payment_id=%s WHERE order_id=%s',
                         ('paid', payment_id, order_id))
            conn.commit()
        return {'ok': True, 'paid': True}
    except Exception:
        # 503 asks MP to retry rather than silently losing a paid event.
        raise HTTPException(503, 'No se pudo verificar el pago')
