# CiviTrace

CiviTrace is an independent, student-built civic transparancy app focused on Sugar Land, TX's 2024 bond program. It organizes published bond figures into a searchable, source linked interface, allowing residents to examine proposed funding, published project allocations, and differences between reported records.

Rather than presenting figures without context, CiviTrace documents where each number came from, as well as what it measures and what it can/cannot reliably claim.

## The Problem

Public infrastructure projects often involve multiple financial figures published across different documentsm, such as:
- A bond authorization
- A project's published allocation
- An adopted budget
- The actual expenditure

Comparing them without accounting for these differences can create misleading impressions about how our public money is collected or spent. CiviTrace aims to address this problem by organizing published figures alongside their sources and applying explicit rules to financial comparisons.

## Features
- Project Explorer: Search projects and filter them by bond proposition
- Financial Comparisons: Compare published figures and calculate absolute/percentage differences when the records are comparable
- Evidence Ledger: Examine individual records, publication dates, source documents, and locations within the documents
- Source-linked Records: Users are able to open the original publications behind reported figures 
- Explicit comparison rules: Reject comparisons between different metrics, projects, or periods instead of presenting potentially misleading calculations
- Missing-data handling: Distinguish an unreported figure from a value of $0
- Methodology and limitations: Document the definitions, assumptions, data-quality issues, and limitations behind the displayed results.

## Scope

The current dataset covers Sugar Land's 2024 bond program, including five bond propositions:

- Proposition A — Public safety
- Proposition B — Streets, sidewalks and mobility
- Proposition C — Drainage
- Proposition D — Municipal facilities
- Proposition E — Animal shelter

The dataset includes published voter-authorization figures and selected project-allocation figures collected from public documents. Each record is associated with its source and the location of the relevant information within that source.

## Data and Methodology

CiviTrace uses a manually curated JSON dataset compiled from publicly available documents. The figures are entered by hand; the application does not scrape these publications or connect to a live city data feed.

Each observation records its subject, metric, value, source, source location, and publication context.

Two financial concepts are currently distinguished:

1. Voter authorization: The maximum amount a bond proposition permits the city to borrow for a category of projects. This is not the amount already spent.
2. Published project allocation: An amount listed for an individual project in a publication. This is not necessarily the final contract price or actual expenditure.

When comparing records, CiviTrace checks whether they refer to the same project or proposition, measure the same metric, cover the same fiscal period, and contain reported values. Differences are calculated as the later published figure minus the earlier published figure. Percentage changes are calculated relative to the earlier figure when that calculation is defined.

A calculated difference describes the figures in the source documents; it does not, by itself, establish why the figures differ or whether the difference is significant.

## Data Sources

The current dataset draws on the following publications:

[City of Sugar Land — City Council Canvasses Election Results for Bond Propositions](https://sugarlandtx.gov/m/newsflash/home/detail/1901)

[Community Impact — September 2024, Sugar Land–Missouri City edition, page 9](https://editions.communityimpact.com/view/644574697/9/)

[Community Impact — October 2024, Sugar Land–Missouri City edition, page 9](https://editions.communityimpact.com/view/544405486/9)

[Community Impact — October 2024, Sugar Land–Missouri City edition, page 16](https://editions.communityimpact.com/view/544405486/16)

The Community Impact publications contain bond information reproduced from city-provided materials. CiviTrace records the publication and page associated with each observation, but the availability of those external sources is not guaranteed. If a publication becomes unavailable, its link may no longer allow readers to verify the original figure. The dataset is manually maintained and does not automatically retrieve or archive the linked publications.

## Limitations

CiviTrace is an exploratory transparency tool, not an official financial reporting system. The dataset is incomplete and does not represent every project or every financial record in the bond program.

- Project figures have been entered manually and require continued verification against original documents.
- Some source publications contain discrepancies in how figures are presented or rounded.
- The dataset does not yet include adopted-budget, capital improvement plan, contract, or expenditure figures.
- Current project status, construction schedules, and spending have not been independently verified by CiviTrace.
- A source link establishes traceability, not the accuracy or completeness of the underlying information.

These limitations are part of the project's methodology: incomplete evidence should remain visible and transparent rather than being silently treated as certainty.

## In-Browser Demo
https://idiot250.github.io/civitrace

## Or run locally!

CiviTrace is a client-side web application built with HTML, CSS, JavaScript, and JSON. It requires no application build step.

Requirements: Python 3 and a modern web browser.

Supprted (tested) browsers:
- Google Chrome
- Brave
- Firefox & Firefox Developer Edition & Firefox Nightly
- Luakit
- Qutebrowser

Clone the repository:

```
git clone <repository-url>
cd <repository-directory>
```

Start a local HTTP server from the project root:

```
python3 -m http.server 8000
```

Open http://localhost:8000 in your browser.

The application fetches its dataset from data/data.json, so it should be served over HTTP rather than opened directly as a local file.

## Project Structure

```
.
├── index.html
├── style.css
├── app.js
└── data/
    └── data.json
```

index.html: Application entry point and navigation.
style.css: Layout, typography, colors, responsive styling, and interface components.
app.js: Routing, data lookup, record comparisons, rendering, and methodology checks.
data/data.json: Project records, financial observations, source metadata, and data-quality notes.

### Technology
- HTML5
- CSS3
- Vanilla JavaScript
- JSON
- Python's built-in HTTP server for local development

The application uses hash-based client-side routing and does not require a frontend framework or database server.

## Disclaimer of Independence

CiviTrace is an independent, student-built project using public records. It is not affiliated with or endorsed by the City of Sugar Land.

## Future Work

Potential next steps include expanding the dataset (or integrating live data), verifying figures against original city documents, incorporating adopted budgets and capital improvement plans, and tracking changes in project information over time.

The goal is to make public financial information easier to investigate without obscuring the evidence, assumptions, or gaps behind it.
