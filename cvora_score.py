"""Transparent, deterministic CV presentation checklist.

This score assesses observable structure and wording, not employability,
recruiter approval, automated screening outcomes, or hiring probability.
"""
from __future__ import annotations

import re
import unicodedata

RUBRIC = (
    ('claridad', 'Claridad y legibilidad', 20),
    ('estructura', 'Estructura', 20),
    ('evidencia', 'Experiencia y proyectos', 20),
    ('formato', 'Presentación del texto', 15),
    ('relevancia', 'Relevancia para el puesto', 15),
    ('datos', 'Información útil', 10),
)

STOPWORDS = set('de la los las y en un una con por para del al el o se que como su sus es a sobre desde sin más esto este esa lo le tu mi nuestro empresa trabajo empleo busca buscamos experiencia tener requiere requerido deseable'.split())
TERMS = ('experiencia', 'experiencia laboral', 'experiencia profesional', 'experiencia y proyectos', 'empleos', 'trabajos', 'proyectos', 'practicas', 'formacion', 'formacion academica', 'educacion', 'estudios', 'habilidades', 'habilidades y herramientas', 'competencias', 'herramientas', 'perfil', 'perfil profesional', 'resumen', 'sobre mi', 'objetivo', 'idiomas', 'cursos', 'certificaciones', 'contacto')
ACTIONS = ('organic', 'coordin', 'gestion', 'atend', 'resolv', 'desarroll', 'implement', 'cre', 'analiz', 'mejor', 'planific', 'colabor', 'automatiz', 'asesor', 'diseñ', 'optimiz', 'mantuv', 'particip', 'proyect')


def _norm(s: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')


def _cap(x: float) -> int:
    return max(0, min(100, round(x)))


def _words(s: str) -> list[str]:
    return re.findall(r'[a-záéíóúñ0-9+#]{3,}', _norm(s))


def evaluate(cv: str, job: str = '') -> dict:
    """Return rubric scores with human-readable actionable explanations."""
    cv = (cv or '')[:25000].strip()
    job = (job or '')[:8500]
    low = _norm(cv)
    lines = [line.strip() for line in cv.splitlines() if line.strip()]
    words = _words(cv)
    size = len(words)
    headers = {t for t in TERMS if any(_norm(line).rstrip(':').strip() == t for line in lines)}
    email = bool(re.search(r'\b[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}\b', cv))
    phone = bool(re.search(r'(?:\+?\d[\d\s().-]{7,}\d)', cv))
    list_items = sum(bool(re.match(r'^[-•*]\s', line)) for line in lines)
    long_lines = sum(len(line.split()) > 27 for line in lines)
    duplicate = (len(set(_norm(line) for line in lines)) / max(1, len(lines)))
    has_edu = bool(headers & {'educacion', 'formacion', 'formacion academica', 'estudios', 'cursos', 'certificaciones'}) or any(x in low for x in ('universidad', 'secundario', 'terciario', 'curso de '))
    has_exp = bool(headers & {'experiencia', 'experiencia laboral', 'experiencia profesional', 'experiencia y proyectos', 'empleos', 'trabajos', 'proyectos', 'practicas'}) or any(x in low for x in ('trabaje ', 'proyecto escolar', 'voluntariado', 'comercio familiar'))
    has_skill = bool(headers & {'habilidades', 'habilidades y herramientas', 'competencias', 'herramientas'})
    has_profile = bool(headers & {'perfil', 'perfil profesional', 'resumen', 'sobre mi', 'objetivo'})
    has_role = any(x in low for x in ('busco', 'puesto', 'objetivo', 'perfil profesional', 'analista', 'desarrollador', 'atencion al cliente'))
    action_count = sum(any(a in w for a in ACTIONS) for w in words)
    number_examples = len(re.findall(r'\b\d+(?:[,.]\d+)?\s*(?:%|personas|clientes|proyectos|ventas|pedidos|equipos|meses)\b', low))
    sections = sum((has_edu, has_exp, has_skill, has_profile))

    claridad = _cap(40 + min(25, size / 13) - (20 if size > 950 else 0) - 7 * long_lines + (12 if 100 <= size <= 550 else 0) + 11 * duplicate)
    estructura = _cap(15 + 20 * sections + (5 if len(lines) > 4 else 0))
    evidencia = _cap(15 + (20 if has_exp else 0) + min(27, action_count * 7) + min(20, number_examples * 10) + min(14, list_items * 3))
    formato = _cap(32 + (20 if len(lines) >= 6 else 0) + (14 if sections >= 2 else 0) + (12 if list_items else 0) + (10 if duplicate > .9 else 0) - 7 * long_lines)
    if job.strip():
        jobwords = set(w for w in _words(job) if w not in STOPWORDS and len(w) > 3)
        if jobwords:
            matched = sum(w in set(words) for w in jobwords)
            relevancia = _cap(24 + 76 * matched / len(jobwords))
        else:
            relevancia = 50
    else:
        relevancia = _cap(28 + (30 if has_role else 0) + (20 if has_skill else 0) + (12 if has_profile else 0))
    datos = _cap(10 + (28 if email else 0) + (18 if phone else 0) + (20 if has_edu else 0) + (18 if has_skill else 0) + (16 if has_exp else 0))
    values = dict(claridad=claridad, estructura=estructura, evidencia=evidencia, formato=formato, relevancia=relevancia, datos=datos)
    score = _cap(sum(values[k] * weight for k, _, weight in RUBRIC) / 100)
    tips = []
    if not email: tips.append('Agregá una dirección de correo válida para que puedan contactarte.')
    if not has_edu: tips.append('Ordená tus estudios, cursos o formación en un apartado claro.')
    if not has_exp: tips.append('Explicá actividades, prácticas o proyectos reales; no necesitás tener empleo formal.')
    if not has_skill: tips.append('Agrupá tus habilidades reales en una sección fácil de localizar.')
    if not has_profile: tips.append('Sumá una presentación breve que explique qué aportás o qué tipo de puesto buscás.')
    if action_count < 2: tips.append('Describí tareas concretas con verbos de acción; agregá resultados solo si podés demostrarlos.')
    if size > 950: tips.append('Reducí las repeticiones y priorizá información relacionada con el puesto.')
    if job.strip() and relevancia < 60: tips.append('Comprobá qué requisitos del anuncio cumplís y hacelos fáciles de identificar.')
    if not tips: tips.append('La presentación está bien encaminada. Revisá la precisión de cada dato y adaptalo a cada búsqueda.')
    return {
        'score': score,
        'level': 'Necesita mejoras' if score < 40 else 'En desarrollo' if score < 70 else 'Bien presentado',
        'tone': 'low' if score < 40 else 'mid' if score < 70 else 'high',
        'categories': [dict(id=k, label=label, weight=weight, value=values[k]) for k, label, weight in RUBRIC],
        'tips': tips[:5],
        'method': 'Puntuación orientativa de presentación y contenido basada en reglas de CVORA; no es una probabilidad de contratación ni una evaluación real de reclutadores.',
    }
