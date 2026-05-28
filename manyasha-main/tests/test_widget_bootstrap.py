from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_widget_html_uses_safe_redirect_bootstrap() -> None:
    html = _read("frontend/public/widget.html")

    assert "document.write" not in html
    assert "fetch('/mascot-design-preview.html')" not in html
    assert "location.replace" in html
    assert "target.searchParams.set('embed', '1')" in html


def test_dist_widget_html_keeps_public_embed_contract_params() -> None:
    html = _read("frontend/dist/widget.html")

    assert "target.searchParams.set('site_key', siteKey)" in html
    assert "target.searchParams.set('install_token', installToken)" in html
    assert "target.searchParams.set('embed_contract_version', embedContractVersion)" in html


def test_embed_script_passes_embed_and_api_origin() -> None:
    source = _read("app.py")

    assert "iframeUrl.searchParams.set('embed', '1');" in source
    assert "iframeUrl.searchParams.set('api_origin', apiOrigin);" in source
    assert "var iframeMounted = false;" in source or "var iframeMounted=false;" in source
    assert "window.ManyashaWidget = window.ManyashaWidget || {};" in source
    assert "NS.instances = NS.instances || {};" in source


def test_embed_script_exposes_install_health_api() -> None:
    source = _read("app.py")

    assert "getInstallHealth: function()" in source
    assert "widget_iframe_timeout" in source
    assert "/api/manyasha/widget-install-health" in source


def test_preview_supports_query_bootstrap_and_api_url_helper() -> None:
    preview = _read("frontend/public/mascot-design-preview.html")
    source = _read("frontend/public/widget/widget-core.js")

    assert "queryParam('embed')" in source
    assert "window.__manyashaApiUrl = manyashaApiUrl;" in source
    assert "/api/manyasha/widget-context?pid=" in source
    assert "&sid=" in source
    assert "window.__manyashaEnsureBackendContext = ensureManyashaBackendContext;" in source
    assert "buildInstallHealthUrl" in source
    assert "fetchInstallHealth" in source
    assert "<script src=\"./widget/widget-core.js\"></script>" in preview
