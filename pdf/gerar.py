"""Gera pdf/<nome>.pdf a partir de <nome>.md (usa o Edge em modo headless).
   python pdf/gerar.py              → plano-central
   python pdf/gerar.py cs-respostas → cs-respostas
"""
import re, subprocess, pathlib, sys, markdown
aqui = pathlib.Path(__file__).resolve().parent
nome = sys.argv[1] if len(sys.argv) > 1 else "plano-central"
src = (aqui.parent / f"{nome}.md").read_text(encoding="utf-8")
titulo = src.splitlines()[0].lstrip("# ").strip()
out = []
for l in src.split("\n"):
    # python-markdown pede linha em branco antes de lista e recuo de 4 nas sublistas
    if re.match(r"\s*- ", l) and out and out[-1].strip() and not re.match(r"\s*- ", out[-1]) and not out[-1].startswith("  "):
        out.append("")
    m = re.match(r"^  (- .*)", l)
    out.append("    " + m.group(1) if m else l)
body = markdown.markdown("\n".join(out), extensions=["tables"])
css = """
@page{size:A4;margin:16mm 15mm 18mm}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1d232b;font-size:10.3pt;line-height:1.5}
h1{font-size:22pt;margin:0 0 4pt;color:#0f2340;letter-spacing:-.3px}
h2{font-size:14pt;color:#0f2340;border-bottom:2px solid #c9a24a;padding-bottom:3pt;margin:20pt 0 8pt;break-after:avoid}
h3{font-size:11.5pt;color:#0f2340;margin:14pt 0 6pt;break-after:avoid}
blockquote{margin:0 0 10pt;padding:6pt 10pt;background:#f4f1e8;border-left:3px solid #c9a24a;color:#4a4f57}
blockquote p{margin:2pt 0}
table{border-collapse:collapse;width:100%;margin:6pt 0 10pt;font-size:9pt}
tr{break-inside:avoid}
th{background:#0f2340;color:#fff;text-align:left;padding:5pt 6pt;font-weight:600}
td{border-bottom:1px solid #dde1e6;padding:5pt 6pt;vertical-align:top}
tr:nth-child(even) td{background:#f7f8fa}
ul,ol{padding-left:16pt;margin:4pt 0 8pt} li{margin:2pt 0}
p{margin:5pt 0}
"""
html = aqui / f"{nome}.html"
html.write_text(f"<!doctype html><html lang=pt-BR><head><meta charset=utf-8><title>{titulo}</title><style>{css}</style></head><body>{body}</body></html>", encoding="utf-8")
edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
subprocess.run([edge, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                f"--print-to-pdf={aqui / (nome + '.pdf')}", html.as_uri()], capture_output=True)
print("ok", aqui / f"{nome}.pdf")
