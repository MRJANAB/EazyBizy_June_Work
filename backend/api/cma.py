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
            # PDF is a replica of the Excel — both render from the same sections.
            from cma.pdf_report import build_cma_pdf
            pdf_bytes = build_cma_pdf(results)
            
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={filename_base}.pdf",
                    "Access-Control-Expose-Headers": "Content-Disposition"
                }
            )
            
        elif format.lower() in ["excel", "csv"]:
            output = io.BytesIO()

            if format.lower() == "excel":
                # Standard RBI/Nayak-Tandon multi-sheet CMA workbook (Phase A).
                from cma.excel_report import build_cma_workbook
                output = io.BytesIO(build_cma_workbook(results))
                content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                extension = "xlsx"
            else:
                # CSV — flat operating statement as the primary export.
                pd.DataFrame(results["operating_statement"]).to_csv(output, index=False)
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
