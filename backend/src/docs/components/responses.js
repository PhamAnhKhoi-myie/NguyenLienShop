module.exports = {
    "BadRequest": {
        "description": "Bad Request / Validation",
        "content": {
            "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/ErrorResponse"
                }
            }
        }
    },
    "NotFound": {
        "description": "Not Found",
        "content": {
            "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/ErrorResponse"
                }
            }
        }
    },
    "Unauthorized": {
        "description": "Unauthorized",
        "content": {
            "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/ErrorResponse"
                }
            }
        }
    },
    "Forbidden": {
        "description": "Forbidden",
        "content": {
            "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/ErrorResponse"
                }
            }
        }
    },
    "Conflict": {
        "description": "Conflict",
        "content": {
            "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/ErrorResponse"
                }
            }
        }
    },
    "TooManyRequests": {
        "description": "Too Many Requests",
        "content": {
            "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/ErrorResponse"
                }
            }
        }
    },
    "ServiceUnavailable": {
        "description": "Service Unavailable",
        "content": {
            "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/ErrorResponse"
                }
            }
        }
    },
    "InternalError": {
        "description": "Internal Server Error",
        "content": {
            "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/ErrorResponse"
                }
            }
        }
    }
};
