"""Public presentation rubric and quick-CV interface regression checks."""
from fastapi.testclient import TestClient
from main import app
from cvora_score import evaluate

client = TestClient(app)
ROUGH = 'Sofía Díaz\nsofia@ejemplo.com\nEXPERIENCIA\nAtendí en un comercio familiar y ayudé con productos.'
CLEAR = '''Sofía Díaz
sofia@ejemplo.com

PERFIL PROFESIONAL
Busco un puesto de atención al cliente donde aplicar organización y comunicación.

EXPERIENCIA Y PROYECTOS
• Atendí a clientes y resolví consultas en un comercio familiar.
• Organicé productos y coordiné tareas de reposición.

EDUCACIÓN
Secundario completo

HABILIDADES
Atención al cliente, organización, comunicación y Excel básico.'''


def test_score_is_deterministic_and_explained():
    a = evaluate(ROUGH)
    assert 0 <= a['score'] <= 100
    assert a == evaluate(ROUGH)
    assert len(a['categories']) == 6
    assert sum(item['weight'] for item in a['categories']) == 100
    assert 'no es una probabilidad' in a['method'].lower()


def test_better_structured_cv_can_improve_but_not_maximize_automatically():
    before = evaluate(ROUGH)
    after = evaluate(CLEAR)
    assert before['score'] < after['score'] < 100
    assert all(0 <= entry['value'] <= 100 for entry in after['categories'])


def test_post_score_endpoint_and_validation():
    ok = client.post('/api/score', json={'cv': CLEAR})
    assert ok.status_code == 200
    assert ok.json()['score'] == evaluate(CLEAR)['score']
    assert client.post('/api/score', json={'cv': 'a'}).status_code == 422


def test_quick_cv_and_theme_controls_in_home():
    res = client.get('/')
    assert res.status_code == 200
    for marker in (b'themeToggle', b'heroQuick', b'quickStartBtn', b'scoreBeforeValue', b'scoreAfterValue', b'scoreCategoryRows', b'createName', b'createExperience'):
        assert marker in res.content


def test_css_has_both_appearances():
    response = client.get('/static/styles.css')
    assert response.status_code == 200
    assert 'data-theme=light' in response.text
    assert 'score-cards' in response.text
