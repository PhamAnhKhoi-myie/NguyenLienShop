
module.exports = {
    "ErrorResponse": {
        "type": "object",
        "properties": {
            "success": {
                "type": "boolean",
                "example": false
            },
            "code": {
                "type": "string",
                "example": "SHIPMENT_NOT_FOUND"
            },
            "message": {
                "type": "string",
                "example": "Shipment not found"
            }
        }
    },
    "PaginatedMeta": {
        "type": "object",
        "properties": {
            "page": {
                "type": "integer",
                "minimum": 1,
                "example": 1
            },
            "limit": {
                "type": "integer",
                "minimum": 1,
                "example": 20
            },
            "total": {
                "type": "integer",
                "minimum": 0,
                "example": 150
            }
        },
        "required": [
            "page",
            "limit",
            "total"
        ]
    },
    "PaginatedResponse": {
        "type": "object",
        "description": "Expected standard for list (no path attached). `data` = array items; When implementing, use allOf or a separate schema for each resource.",
        "properties": {
            "success": {
                "type": "boolean",
                "example": true
            },
            "message": {
                "type": "string",
                "example": "OK"
            },
            "data": {
                "type": "array",
                "items": {
                    "type": "object",
                    "description": "Replace with $ref to element schema"
                },
                "example": []
            },
            "meta": {
                "$ref": "#/components/schemas/PaginatedMeta"
            }
        },
        "required": [
            "success",
            "message",
            "data",
            "meta"
        ],
        "example": {
            "success": true,
            "message": "OK",
            "data": [],
            "meta": {
                "page": 1,
                "limit": 20,
                "total": 150
            }
        }
    },
    "DeleteResponse": {
        "type": "object",
        "properties": {
            "success": {
                "type": "boolean",
                "example": true
            },
            "message": {
                "type": "string",
                "example": "Deleted successfully"
            }
        },
        "required": [
            "success",
            "message"
        ]
    },
    "PaginationMeta": {
        "type": "object",
        "properties": {
            "page": {
                "type": "integer"
            },
            "limit": {
                "type": "integer"
            },
            "total": {
                "type": "integer"
            },
            "totalPages": {
                "type": "integer"
            }
        }
    }
};
