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
                    "balance_sheet": results["balance_sheet"],
                    "ratios": results["ratios"],
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
            
            # For balance sheet, it's nested, so we flatten it slightly
            bs_flat = []
            for year_data in results["balance_sheet"]:
                bs_flat.append({
                    "Year": year_data["year"],
                    "Total Assets": year_data["assets"]["total_assets"],
                    "Current Assets": year_data["assets"]["current_assets"]["total"],
                    "Net Worth": year_data["liabilities"]["net_worth"],
                    "Term Loans": year_data["liabilities"]["term_loans"],
                    "Current Liab": year_data["liabilities"]["current_liabilities"]
                })
            df_bs = pd.DataFrame(bs_flat)
            
            if format.lower() == "excel":
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df_ops.to_excel(writer, sheet_name='Operating Statement', index=False)
                    df_bs.to_excel(writer, sheet_name='Balance Sheet', index=False)
                    df_ratios.to_excel(writer, sheet_name='Ratios', index=False)
                
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
