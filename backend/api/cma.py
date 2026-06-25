from fastapi import APIRouter, HTTPException, Response
from cma.intake_mapper import CMAIntake
from cma.report_builder import generate_cma_report
from cma.validator import validate_cma_intake
import json
import io
import pandas as pd
from datetime import datetime

router = APIRouter(prefix="/api/cma", tags=["CMA"])

@router.post("/generate")
async def generate_cma(payload: CMAIntake):
    try:
        # Validation
        val_errors = validate_cma_intake(payload)
        if val_errors:
            raise HTTPException(status_code=400, detail={"errors": val_errors})

        # Convert Pydantic model to dict for the report builder
        intake_data = payload.model_dump()
        results = generate_cma_report(intake_data)
        return {
            "status": "success",
            **results
        }
    except Exception as e:
        print(f"CMA Generate Error: {str(e)}")
        raise HTTPException(status_code=500, detail="CMA generation failed. Check server logs.")

@router.post("/download")
async def download_cma(payload: CMAIntake, format: str = "pdf"):
    try:
        # Convert Pydantic model to dict for the report builder
        intake_data = payload.model_dump()
        results = generate_cma_report(intake_data)
        
        filename_base = f"CMA_Report_{payload.applicant.pan}_{datetime.now().strftime('%Y%m%d')}"
        
        if format.lower() == "pdf":
            # Map the results to the PDF generator's expected structure
            pdf_data = {
                "application_id": "CMA-" + payload.applicant.pan,
                "business_name": payload.business.entity_name,
                "promoter_name": payload.applicant.name,
                "projections": {
                    "operating_statement": results["operating_statement"],
                    "historical_operating_statement": results.get("historical_operating_statement", []),
                    "projection_continuity": results.get("projection_continuity", {}),
                    "balance_sheet": results["balance_sheet"],
                    "ratios": results["ratios"],
                    "cash_flow": results.get("cash_flow", []),
                    "mpbf_by_year": results.get("mpbf_by_year", []),
                    "dscr": {
                        "average": results["summary"]["avg_dscr"],
                        "yearly": [{"year": r["year"], "dscr": r["dscr"]} for r in results["ratios"]]
                    },
                    "working_capital": {
                        "mpbf": results["mpbf"].get("method2", results["mpbf"].get("recommended", 0))
                    }
                }
            }
            from pdf.cma_generator import create_cma_pdf
            pdf_bytes = create_cma_pdf(pdf_data)
            
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={filename_base}.pdf",
                    "Access-Control-Expose-Headers": "Content-Disposition"
                }
            )
            
        elif format.lower() in ["excel", "csv"]:
            # Create a multi-sheet Excel or a flattened CSV
            output = io.BytesIO()
            
            # Prepare dataframes for different sections
            df_ops = pd.DataFrame(results["operating_statement"])
            df_ratios = pd.DataFrame(results["ratios"])

            # For balance sheet, it's nested, so we flatten it (keys per balance_sheet.py)
            bs_flat = []
            for year_data in results["balance_sheet"]:
                assets = year_data["assets"]
                ca = assets["current_assets"]
                liab = year_data["liabilities"]
                bs_flat.append({
                    "Year": year_data["year"],
                    "Net Fixed Assets": assets.get("fixed_assets", 0),
                    "RM Stock": ca.get("rm_stock", 0),
                    "WIP": ca.get("wip", 0),
                    "Finished Goods": ca.get("fg", 0),
                    "Inventory (Total)": ca.get("stock", 0),
                    "Debtors": ca.get("debtors", 0),
                    "Cash & Bank": ca.get("cash", 0),
                    "Current Assets": ca.get("total", 0),
                    "Other Assets": assets.get("other_assets", 0),
                    "Total Assets": assets.get("total", 0),
                    "Net Worth": liab.get("net_worth", 0),
                    "Term Loan": liab.get("term_loan", 0),
                    "WC Loan": liab.get("wc_loan", 0),
                    "Creditors": liab.get("creditors", 0),
                    "Total Liabilities": liab.get("total", 0),
                    "Tally Check": year_data.get("check", 0),
                })
            df_bs = pd.DataFrame(bs_flat)

            # New sections produced by the bankable engine
            df_cf   = pd.DataFrame(results.get("cash_flow", []))
            df_mpbf = pd.DataFrame(results.get("mpbf_by_year", []))
            df_hist = pd.DataFrame(results.get("historical_operating_statement", []))

            if format.lower() == "excel":
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    if not df_hist.empty:
                        df_hist.to_excel(writer, sheet_name='Historical (Audited)', index=False)
                    df_ops.to_excel(writer, sheet_name='Operating Statement', index=False)
                    df_bs.to_excel(writer, sheet_name='Balance Sheet', index=False)
                    if not df_cf.empty:
                        df_cf.to_excel(writer, sheet_name='Cash Flow', index=False)
                    df_ratios.to_excel(writer, sheet_name='Ratios', index=False)
                    if not df_mpbf.empty:
                        df_mpbf.to_excel(writer, sheet_name='MPBF', index=False)

                content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                extension = "xlsx"
            else:
                # For CSV, we just take the operating statement as primary or combine them
                df_ops.to_csv(output, index=False)
                content_type = "text/csv"
                extension = "csv"
            
            output.seek(0)
            return Response(
                content=output.getvalue(),
                media_type=content_type,
                headers={
                    "Content-Disposition": f"attachment; filename={filename_base}.{extension}",
                    "Access-Control-Expose-Headers": "Content-Disposition"
                }
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")

    except Exception as e:
        print(f"CMA Download Error: {str(e)}")
        if "validation error" in str(e).lower():
            raise HTTPException(status_code=422, detail="Invalid input data. Please check all required fields.")
        raise HTTPException(status_code=500, detail="CMA download failed. Check server logs.")
