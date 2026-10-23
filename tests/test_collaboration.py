from fastapi.testclient import TestClient
import main

client = TestClient(main.app)
CV = ('Valentina Rojas\nvalentina@ejemplo.com\nEDUCACIÓN\nSecundario completo\nPROYECTOS\n'
      'Organicé una feria escolar con mi grupo.\nHABILIDADES\nExcel básico y comunicación.')


def test_initial_variants_demo(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    r = client.post('/api/analyze',json={'cv':CV,'profile':'auto'})
    assert r.status_code==200
    body=r.json()
    assert [v['id'] for v in body['variants']]==['equilibrado','breve','detallado']
    assert body['mode']=='demo'
    assert all('Valentina Rojas' in v['content'] for v in body['variants'])
    assert len(body['sources'])==3


def test_refine_demo_and_validation(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    payload={'original_cv':CV,'current_cv':CV,'feedback':'no-me-gusta','preset':'menos-texto','request':'Está largo'}
    r=client.post('/api/refine',json=payload)
    assert r.status_code==200
    assert r.json()['mode']=='demo'
    assert 'Valentina Rojas' in r.json()['rewritten_cv']
    assert 'ajuste básico' in r.json()['label'].lower()
    payload.update({'preset':'personalizado','request':'','feedback':'ajustes'})
    assert client.post('/api/refine',json=payload).status_code==422


def test_ai_modes_with_fake_structured_provider(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY','fake-for-tests')
    monkeypatch.setenv('CVORA_ENABLE_AI','true')
    main.AI_CALLS.clear()
    requests=[]
    def fake_structured(prompt,schema,name):
        requests.append((name,prompt))
        if name=='cvora_initial_v2':
            return {
                'headline':'Perfil mejorado', 'suggestions':['Destacá proyecto'], 'changes':['Mejoré claridad'],
                'questions_to_confirm':['¿Tenés disponibilidad?'], 'keywords_to_review':['Excel'],
                'variants':[
                    {'id':'equilibrado','title':'Profesional','description':'Claro','content':CV},
                    {'id':'breve','title':'Breve','description':'Compacto','content':CV},
                    {'id':'detallado','title':'Detallado','description':'Ampliado','content':CV},
                ]}
        return {'headline':'Nueva versión', 'suggestions':[], 'changes':['Más breve'],
                'questions_to_confirm':[], 'rewritten_cv':CV+'\nDISPONIBILIDAD\nTarde',
                'assistant_message':'Ajusté la longitud sin modificar tus antecedentes.'}
    monkeypatch.setattr(main,'structured_response',fake_structured)
    first=client.post('/api/analyze',json={'cv':CV,'ai_consent':True})
    assert first.status_code==200
    assert first.json()['mode']=='ai'
    second=client.post('/api/refine',json={
        'original_cv':CV,'current_cv':CV,'ai_consent':True,'request':'Más corto, por favor',
        'preset':'menos-texto','feedback':'me-gusta'})
    assert second.status_code==200
    assert second.json()['mode']=='ai'
    assert 'Ajusté' in second.json()['assistant_message']
    assert len(requests)==2 and 'Más corto' in requests[1][1]


def test_ai_permission_required_each_iteration(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY','fake')
    monkeypatch.setenv('CVORA_ENABLE_AI','true')
    res=client.post('/api/refine',json={'original_cv':CV,'current_cv':CV,'preset':'menos-texto','ai_consent':False})
    assert res.status_code==200 and res.json()['mode']=='demo'


def test_sources_and_private_headers():
    r=client.get('/api/guides')
    assert r.status_code==200
    assert len(r.json()['sources'])==3
    assert client.get('/').headers['Cache-Control']=='no-store'
