# Foresight AI — Final Submission Checklist

**Project:** Foresight AI — Supply Intelligence  
**Internship:** ZIDIO Development  
**Author:** Priyadarshan S V  
**Status:** Final project package

## 1. ZIDIO FORESIGHT deliverables

The ZIDIO engagement brief defines seven core deliverables (D1–D7):

- [x] **D1 — Data pipeline:** reproducible ingestion, cleaning and analysis-ready dataset; `python src/pipeline.py` reproduces the pipeline.
- [x] **D2 — Data-quality & EDA insight memo:** `reports/data_quality_report.md` documents data issues, resolutions and business insights.
- [x] **D3 — Demand forecast model:** LightGBM + Seasonal Naive baseline with rolling-origin validation and WAPE comparison.
- [x] **D4 — Risk scoring:** stockout/overstock classification, recommended actions and ₹ business impact.
- [x] **D5 — Planning dashboard:** deployed Foresight AI dashboard with forecast, inventory risk, reorder and AI insight views.
- [x] **D6 — Deployed scoring service:** FastAPI backend deployed at `https://foresight-ai-6mlt.onrender.com`.
- [x] **D7 — Executive readout:** `reports/EXECUTIVE_READOUT.md` plus the downloadable 8-slide PPTX prepared for submission.

The brief defines the submission marks as repository/notebooks, dashboard/deployment, executive readout, and a 3–5 minute demo video.

## 2. Submission items explicitly required by the brief

- [x] Git repository containing pipeline, notebook and model code
- [x] Live dashboard URL
- [x] Live scoring-service URL
- [x] README with problem, data, setup/run steps, WAPE vs baseline and assumptions
- [x] Executive readout
- [x] Data-quality & EDA memo
- [ ] **3–5 minute unlisted demo video** — must be recorded/uploaded by the intern
- [ ] **Completed cohort submission form** — must be completed in the ZIDIO portal

The ZIDIO brief explicitly says a missing submission item is a missing mark and requires all six items above by the cohort deadline. fileciteturn193file1L64-L76

## 3. Project quality checks

- [x] Source code committed to GitHub
- [x] Frontend dashboard completed
- [x] FastAPI backend integration included
- [x] Deterministic demo fallback included
- [x] Forecasting workflow implemented
- [x] Time-series model validation documented
- [x] Inventory risk and reorder logic implemented
- [x] Business-impact calculations documented
- [x] Ask Foresight chatbot included
- [x] Runtime status polished for demo/evaluation use
- [x] Copyright notice added
- [x] MIT license added
- [x] Reproducibility notebook added
- [x] Executive readout memo added
- [x] Demo guide added

## 4. Separate internship / academic documents

Keep these outside the public GitHub repository when they contain personal information, signatures or confidential material:

- Internship offer / joining letter
- Internship completion certificate
- College-required internship certificate or approval form
- Final internship/project report (PDF/DOCX version)
- Project presentation / PPT
- Declaration and acknowledgement pages, where required
- Daily/weekly activity log or timesheet, where required
- Mentor evaluation / feedback form, where required
- Final project screenshots, where requested

## 5. Final handover URLs

- **GitHub:** `https://github.com/darshxn10x/foresight-ai`
- **Live dashboard:** `https://foresight-ai-6mlt.onrender.com`
- **Custom domain target:** `https://priyadarshan.tech` — verify DNS/hosting before submitting it as the primary URL.

## 6. Final review before portal submission

1. Open the live application in an incognito/private window.
2. Test Dashboard, Forecasts, Inventory and AI Insights navigation.
3. Generate a forecast for `SKU001` and verify the recommendation appears.
4. Open **Ask Foresight** and test at least one inventory question.
5. Confirm the application can still demonstrate its core workflow when the backend is unavailable.
6. Confirm the GitHub `main` branch contains the final commit.
7. Record the 3–5 minute demo video using the final build.
8. Upload the executive readout and data-quality/EDA memo in the requested format.
9. Complete the cohort submission form with the repository, dashboard and scoring-service links.
10. Do not make non-essential code changes after final submission.

## Final state

**Project code and documentation:** FINAL.  
**Remaining external submission actions:** demo video + cohort submission form, plus any personal/college documents explicitly requested by the portal.

The engagement brief says the grader should be able to clone the repository, follow the README and reproduce the headline numbers; a project that only works on the developer's laptop is considered a defect. fileciteturn193file1L74-L76
