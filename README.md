# Construction Hub
Open index.html. Pages: index (hub), step-01..15, affiliate, shorts (Studio).
Files: data.js (all data + affiliate tag), shorts-data.js, pipeline/shorts.json (60 scripts), pipeline/run_pipeline.py (render + YouTube upload).
Set your Amazon Associates tag: replace buildsmartpic-20 in data.js / shorts-data.js / pipeline/shorts.json (or pass --tag to the pipeline).
Amazon picks scraped from amazon.com default ranking, ordered by units bought/month, then rating count. Prices drift; re-scrape to refresh.
