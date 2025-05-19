import logging
import sys
import os

def setup_logging():
    """
    Configure logging for the application
    """
    # Determine log level from environment variable or default to INFO
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    numeric_level = getattr(logging, log_level, logging.INFO)

    # Configure root logger
    logging.basicConfig(
        level=numeric_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)]
    )

    # Get the logger
    logger = logging.getLogger("ssc_cgl_backend")

    # Return the configured logger
    return logger

# Create a logger instance that can be imported throughout the app
logger = setup_logging() 