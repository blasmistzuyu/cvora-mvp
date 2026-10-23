from fastapi.testclient import TestClient
from main import app
from commerce import price

client = TestClient(app)

def test_price_and_checkout_disabled(monkeypatch):
    monkeypatch.delenv('MP_ACCESS_TOKEN', raising=False)
    monkeypatch.setenv('CVORA_PRICE_ARS', '4900')
    data = client.get('/api/pricing').json()
    assert data['price'] == 4900
    assert data['currency'] == 'ARS'
    assert data['checkout_available'] is False
    assert data['remaining_credits'] == 0
    response = client.post('/api/checkout')
    assert response.status_code == 503


def test_public_disables_open_ai_without_checkout(monkeypatch):
    monkeypatch.setenv('CVORA_DEPLOYMENT', 'public')
    monkeypatch.setenv('CVORA_ENABLE_AI', 'true')
    monkeypatch.setenv('OPENAI_API_KEY', 'not-a-real-secret')
    monkeypatch.delenv('MP_ACCESS_TOKEN', raising=False)
    assert client.get('/api/health').json()['mode'] == 'demo'
    payload = {'cv': 'Nombre Apellido\nExperiencia laboral en comercio\nOrganizacion de inventarios y atención a clientes.', 'ai_consent': True}
    result = client.post('/api/analyze', json=payload)
    assert result.status_code == 503
