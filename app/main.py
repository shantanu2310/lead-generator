from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.api.routes import api_router
from app.config import settings
from app.core.logging import get_logger, setup_logging
from app.database.base import Base
from app.database.session import _get_engine
from app.websocket.manager import manager

logger = get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    setup_logging(log_level=settings.log_level)
    if settings.sentry_dsn:
        sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.app_env)

    engine = _get_engine()
    if engine:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("database_tables_created")
    else:
        logger.warning("database_not_available")

    yield


app = FastAPI(
    title="Lead Generator API",
    description="Precision lead generation agent focused on accuracy and verified contactability",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.app_debug else None,
    redoc_url="/redoc" if settings.app_debug else None,
)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/pipeline")
async def pipeline_websocket(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    from fastapi.responses import JSONResponse
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": str(exc)}},
    )


HTML_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lead Generator</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
        .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
        h1 { font-size: 2.5rem; margin-bottom: 8px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { color: #94a3b8; margin-bottom: 40px; font-size: 1.1rem; }
        .search-box { background: #1e293b; border-radius: 16px; padding: 32px; margin-bottom: 32px; border: 1px solid #334155; }
        .form-row { display: flex; gap: 16px; margin-bottom: 16px; }
        .form-group { flex: 1; }
        .form-group.small { flex: 0 0 150px; }
        label { display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 6px; font-weight: 500; }
        input { width: 100%; padding: 12px 16px; background: #0f172a; border: 1px solid #334155; border-radius: 10px; color: #e2e8f0; font-size: 1rem; outline: none; transition: border-color 0.2s; }
        input:focus { border-color: #3b82f6; }
        button { width: 100%; padding: 14px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border: none; border-radius: 10px; color: white; font-size: 1.05rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
        button:hover { opacity: 0.9; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .status { text-align: center; margin: 20px 0; color: #94a3b8; font-size: 0.95rem; }
        .spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid #334155; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .results { display: grid; gap: 16px; }
        .lead-card { background: #1e293b; border-radius: 14px; padding: 24px; border: 1px solid #334155; transition: border-color 0.2s; }
        .lead-card:hover { border-color: #3b82f6; }
        .lead-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px; }
        .lead-name { font-size: 1.25rem; font-weight: 600; color: #f1f5f9; }
        .lead-score { background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
        .lead-score.high { background: #22c55e; }
        .lead-score.medium { background: #f59e0b; }
        .lead-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .detail { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #94a3b8; }
        .detail-icon { width: 16px; text-align: center; }
        .detail a { color: #60a5fa; text-decoration: none; }
        .detail a:hover { text-decoration: underline; }
        .verification { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
        .badge { padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 500; }
        .badge.verified { background: #052e16; color: #4ade80; }
        .badge.unverified { background: #1c1917; color: #78716c; }
        .no-results { text-align: center; padding: 40px; color: #64748b; }
        .error { background: #450a0a; border: 1px solid #7f1d1d; border-radius: 10px; padding: 16px; color: #fca5a5; margin-top: 16px; }
        .summary { color: #94a3b8; font-size: 0.9rem; margin-bottom: 20px; padding: 12px 16px; background: #0f172a; border-radius: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Lead Generator</h1>
        <p class="subtitle">AI-powered business lead discovery and verification</p>
        
        <div class="search-box">
            <div class="form-row">
                <div class="form-group">
                    <label for="query">Search Query</label>
                    <input type="text" id="query" placeholder="e.g. plumbers in Austin Texas, dentists near me, restaurants in NYC" value="plumbers in Austin Texas">
                </div>
                <div class="form-group small">
                    <label for="maxLeads">Max Leads</label>
                    <input type="number" id="maxLeads" min="1" max="15" value="15">
                </div>
            </div>
            <button id="searchBtn" onclick="searchLeads()">Generate Leads</button>
        </div>

        <div id="status" class="status" style="display:none;"></div>
        <div id="error" class="error" style="display:none;"></div>
        <div id="results"></div>
    </div>

    <script>
        async function searchLeads() {
            const query = document.getElementById('query').value.trim();
            const maxLeads = document.getElementById('maxLeads').value;
            const btn = document.getElementById('searchBtn');
            const status = document.getElementById('status');
            const error = document.getElementById('error');
            const results = document.getElementById('results');

            if (!query) { error.textContent = 'Please enter a search query'; error.style.display = 'block'; return; }

            btn.disabled = true;
            btn.textContent = 'Generating...';
            status.innerHTML = '<span class="spinner"></span>Searching for businesses, crawling websites, verifying contacts...';
            status.style.display = 'block';
            error.style.display = 'none';
            results.innerHTML = '';

            try {
                const resp = await fetch('/api/v1/leads/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: query, max_leads: parseInt(maxLeads) })
                });
                const data = await resp.json();

                if (!resp.ok) {
                    error.textContent = data.error?.message || 'An error occurred';
                    error.style.display = 'block';
                    status.style.display = 'none';
                    return;
                }

                if (data.leads.length === 0) {
                    results.innerHTML = '<div class="no-results">No leads found matching your criteria. Try a different query.</div>';
                    status.style.display = 'none';
                    return;
                }

                let html = '<div class="summary">Found <strong>' + data.qualified_leads_found + '</strong> qualified leads from <strong>' + data.candidates_checked + '</strong> candidates checked</div>';
                html += '<div class="results">';

                for (const lead of data.leads) {
                    const scoreClass = lead.confidence_score >= 80 ? 'high' : 'medium';
                    html += '<div class="lead-card">';
                    html += '<div class="lead-header">';
                    html += '<div class="lead-name">' + lead.business_name + '</div>';
                    html += '<div class="lead-score ' + scoreClass + '">' + lead.confidence_score + '/100</div>';
                    html += '</div>';
                    html += '<div class="lead-details">';
                    if (lead.website) html += '<div class="detail"><span class="detail-icon">&#127760;</span><a href="' + lead.website + '" target="_blank">' + lead.website.replace('https://', '') + '</a></div>';
                    if (lead.email) html += '<div class="detail"><span class="detail-icon">&#9993;</span><a href="mailto:' + lead.email + '">' + lead.email + '</a></div>';
                    if (lead.phone) html += '<div class="detail"><span class="detail-icon">&#9742;</span>' + lead.phone + '</div>';
                    if (lead.address) html += '<div class="detail"><span class="detail-icon">&#128205;</span>' + lead.address + '</div>';
                    html += '</div>';
                    html += '<div class="verification">';
                    html += '<span class="badge ' + (lead.verification.business_active ? 'verified' : 'unverified') + '">' + (lead.verification.business_active ? '&#10003; Active' : '&#10007; Inactive') + '</span>';
                    html += '<span class="badge ' + (lead.verification.website_identity_verified ? 'verified' : 'unverified') + '">' + (lead.verification.website_identity_verified ? '&#10003; Website Verified' : '&#10007; Website Unverified') + '</span>';
                    html += '<span class="badge ' + (lead.verification.email_verified ? 'verified' : 'unverified') + '">' + (lead.verification.email_verified ? '&#10003; Email Verified' : '&#10007; Email Unverified') + '</span>';
                    html += '<span class="badge ' + (lead.verification.phone_cross_verified ? 'verified' : 'unverified') + '">' + (lead.verification.phone_cross_verified ? '&#10003; Phone Verified' : '&#10007; Phone Unverified') + '</span>';
                    html += '</div>';
                    html += '</div>';
                }

                html += '</div>';
                results.innerHTML = html;
                status.style.display = 'none';
            } catch (e) {
                error.textContent = 'Request failed: ' + e.message;
                error.style.display = 'block';
                status.style.display = 'none';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Generate Leads';
            }
        }

        document.getElementById('query').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchLeads();
        });
    </script>
</body>
</html>"""


@app.get("/", response_class=HTMLResponse)
async def web_ui():
    return HTML_PAGE
