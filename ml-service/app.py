from fastapi import FastAPI

app = FastAPI(
    title="JalDrishti ML Service",
    description="Machine Learning Service interface for groundwater monitoring analytics",
    version="1.0.0"
)

@app.get("/health")
def health_check():
    return {"status": "healthy"}
