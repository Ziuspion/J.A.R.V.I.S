"""Empacota a edição MK XV sem dados pessoais, credenciais ou artefatos duplicados."""
from pathlib import Path
import hashlib
import json
import shutil
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {'dist', 'output', '__pycache__', '.git', '.openai', '.preview-data', 'node_modules'}
SKIP_FILES = {'JARVIS_FUSION_MK_XIV.html', 'GUIA_ATIVACAO_JARVIS_MK_XIV.pdf', 'SHA256SUMS.txt'}


def forbidden(path):
    name = path.name.lower()
    return ((name.startswith('.env') and name != '.env.example')
            or name.endswith(('.pyc', '.sqlite', '.sqlite3', '.db'))
            or '.sqlite3-' in name)


def selected_files():
    return sorted(path for path in ROOT.rglob('*')
                  if path.is_file() and not (set(path.relative_to(ROOT).parts[:-1]) & SKIP_DIRS)
                  and path.name not in SKIP_FILES and not forbidden(path))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_zip(destination, paths, prefix=''):
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path, relative in paths:
            if forbidden(path):
                raise ValueError('Arquivo não publicável: ' + str(relative))
            archive.write(path, prefix + relative.as_posix())
    with zipfile.ZipFile(destination) as archive:
        assert archive.testzip() is None, 'ZIP corrompido'
        for name in archive.namelist():
            assert '..' not in Path(name).parts and not name.startswith('/')
    return {'file': destination.name, 'bytes': destination.stat().st_size, 'sha256': digest(destination)}


def main():
    output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent / 'entrega_mk_xv'
    if output == ROOT or ROOT in output.parents:
        raise ValueError('Escolha uma saída fora da pasta do código.')
    output.mkdir(parents=True, exist_ok=True)
    for required in ['JARVIS_MK_XV.html', 'docs/GUIA_COMPLETO_JARVIS_MK_XV.pdf',
                     'docs/RELATORIO_MK_XV.md', 'docs/VALIDACAO_MK_XV.json', 'dist/index.html']:
        assert (ROOT / required).is_file(), 'Arquivo necessário: ' + required
    result = json.loads((ROOT / 'docs/VALIDACAO_MK_XV.json').read_text('utf-8'))
    assert result['tests']['total'] >= 5500
    assert result['build']['portableBytes'] == (ROOT / 'JARVIS_MK_XV.html').stat().st_size
    files = selected_files()
    manifest = ROOT / 'SHA256SUMS.txt'
    manifest.write_text(''.join(digest(path) + '  ' + path.relative_to(ROOT).as_posix() + '\n'
                                for path in files), encoding='utf-8')
    files.append(manifest)
    artifacts = [write_zip(output / 'JARVIS_MK_XV_COMPLETO.zip',
                           [(path, path.relative_to(ROOT)) for path in files], 'JARVIS_MK_XV/')]
    web = sorted(path for path in (ROOT / 'dist').rglob('*') if path.is_file())
    assert all(path.stat().st_size < 25 * 1024 * 1024 for path in web)
    assert not any(path.name == 'JARVIS_MK_XV.html' for path in web)
    artifacts.append(write_zip(output / 'JARVIS_MK_XV_PUBLICAR.zip',
                               [(path, path.relative_to(ROOT / 'dist')) for path in web]))
    for source in [ROOT / 'JARVIS_MK_XV.html', ROOT / 'docs/GUIA_COMPLETO_JARVIS_MK_XV.pdf']:
        target = output / source.name
        shutil.copy2(source, target)
        artifacts.append({'file': target.name, 'bytes': target.stat().st_size, 'sha256': digest(target)})
    (output / 'ENTREGA_SHA256.json').write_text(json.dumps(artifacts, indent=2) + '\n', 'utf-8')
    print(json.dumps({'sourceFiles': len(files), 'webFiles': len(web), 'artifacts': artifacts}, indent=2))


if __name__ == '__main__':
    main()
