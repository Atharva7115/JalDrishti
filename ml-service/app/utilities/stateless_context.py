import contextvars
import pandas as pd
import extraction.loader as loader

# Context-local variable to hold the readings DataFrame for the request
_request_readings = contextvars.ContextVar("request_readings")

# Store a reference to the original database/CSV loader function
_original_load_station = loader.load_station

def stateless_load_station(station_id: str, use_csv: bool = False) -> pd.DataFrame:
    try:
        # Retrieve the DataFrame from the context-local request variable
        return _request_readings.get()
    except LookupError:
        # Fall back to original DB/CSV loader if not in an API request context
        return _original_load_station(station_id, use_csv=use_csv)

# Globally override loader.load_station with our stateless version
loader.load_station = stateless_load_station

class StatelessContext:
    """
    Context manager to bind a specific DataFrame to the current execution context.
    Any calls to `loader.load_station` within this block will return `readings_df`.
    """
    def __init__(self, readings_df: pd.DataFrame):
        self.readings_df = readings_df
        self.token = None

    def __enter__(self):
        self.token = _request_readings.set(self.readings_df)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        _request_readings.reset(self.token)
