// Auto-split from legacy swagger.js.
module.exports = {
    "ShippingAddress": {
        "type": "object",
        "required": [
            "recipient_name",
            "phone",
            "address",
            "ward",
            "district",
            "province"
        ],
        "properties": {
            "recipient_name": {
                "type": "string",
                "example": "Nguyễn Văn A"
            },
            "phone": {
                "type": "string",
                "example": "0912345678"
            },
            "address": {
                "type": "string",
                "example": "123 Đường ABC"
            },
            "ward": {
                "type": "string",
                "example": "Phường 1"
            },
            "district": {
                "type": "string",
                "example": "Quận 1"
            },
            "province": {
                "type": "string",
                "example": "TP. Hồ Chí Minh"
            },
            "postal_code": {
                "type": "string",
                "example": "70000"
            },
            "country": {
                "type": "string",
                "default": "Vietnam"
            }
        }
    },
    "Timeline": {
        "type": "object",
        "properties": {
            "created_at": {
                "type": "string",
                "format": "date-time"
            },
            "picked_up_at": {
                "type": "string",
                "format": "date-time",
                "nullable": true
            },
            "in_transit_at": {
                "type": "string",
                "format": "date-time",
                "nullable": true
            },
            "at_destination_at": {
                "type": "string",
                "format": "date-time",
                "nullable": true
            },
            "delivered_at": {
                "type": "string",
                "format": "date-time",
                "nullable": true
            },
            "failed_at": {
                "type": "string",
                "format": "date-time",
                "nullable": true
            },
            "cancelled_at": {
                "type": "string",
                "format": "date-time",
                "nullable": true
            },
            "returned_at": {
                "type": "string",
                "format": "date-time",
                "nullable": true
            }
        }
    },
    "FailureInfo": {
        "type": "object",
        "nullable": true,
        "properties": {
            "reason": {
                "type": "string",
                "enum": [
                    "address_incorrect",
                    "recipient_unavailable",
                    "refused_delivery",
                    "damaged_package",
                    "lost",
                    "weather_delay",
                    "carrier_error",
                    "other"
                ]
            },
            "reason_label": {
                "type": "string"
            },
            "notes": {
                "type": "string"
            },
            "retry_count": {
                "type": "integer",
                "minimum": 0
            },
            "max_retries": {
                "type": "integer"
            },
            "can_retry": {
                "type": "boolean"
            },
            "last_retry_at": {
                "type": "string",
                "format": "date-time",
                "nullable": true
            },
            "next_retry_available_at": {
                "type": "string",
                "format": "date-time"
            }
        }
    },
    "ShipmentDTO": {
        "type": "object",
        "properties": {
            "id": {
                "type": "string"
            },
            "order_id": {
                "type": "string"
            },
            "carrier": {
                "type": "string",
                "enum": [
                    "GHN",
                    "GHTK",
                    "JT",
                    "GRAB",
                    "BEST",
                    "OTHER"
                ]
            },
            "tracking_code": {
                "type": "string"
            },
            "tracking_url": {
                "type": "string",
                "nullable": true
            },
            "shipping_address": {
                "$ref": "#/components/schemas/ShippingAddress"
            },
            "status": {
                "type": "string",
                "enum": [
                    "pending",
                    "picked_up",
                    "in_transit",
                    "at_destination",
                    "delivered",
                    "failed",
                    "cancelled",
                    "returned"
                ]
            },
            "status_label": {
                "type": "string"
            },
            "timeline": {
                "$ref": "#/components/schemas/Timeline"
            },
            "progress": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100
            },
            "failure": {
                "$ref": "#/components/schemas/FailureInfo"
            },
            "created_at": {
                "type": "string",
                "format": "date-time"
            },
            "updated_at": {
                "type": "string",
                "format": "date-time"
            }
        }
    },
    "ShipmentListDTO": {
        "type": "object",
        "properties": {
            "id": {
                "type": "string"
            },
            "order_id": {
                "type": "string"
            },
            "carrier": {
                "type": "string"
            },
            "tracking_code": {
                "type": "string"
            },
            "status": {
                "type": "string"
            },
            "status_label": {
                "type": "string"
            },
            "progress": {
                "type": "integer"
            },
            "recipient_name": {
                "type": "string"
            },
            "destination": {
                "type": "string"
            },
            "created_at": {
                "type": "string",
                "format": "date-time"
            },
            "delivered_at": {
                "type": "string",
                "format": "date-time",
                "nullable": true
            }
        }
    },
    "TrackingDTO": {
        "type": "object",
        "properties": {
            "order_id": {
                "type": "string"
            },
            "status": {
                "type": "string"
            },
            "status_label": {
                "type": "string"
            },
            "progress": {
                "type": "integer"
            },
            "carrier": {
                "type": "string"
            },
            "tracking_code": {
                "type": "string"
            },
            "tracking_url": {
                "type": "string",
                "nullable": true
            },
            "timeline": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "timestamp": {
                            "type": "string",
                            "format": "date-time"
                        },
                        "timestamp_formatted": {
                            "type": "string"
                        },
                        "status": {
                            "type": "string"
                        },
                        "label": {
                            "type": "string"
                        }
                    }
                }
            },
            "destination": {
                "type": "string"
            },
            "estimated_delivery": {
                "type": "string"
            },
            "last_update": {
                "type": "string",
                "format": "date-time"
            }
        }
    },
    "CreateShipmentInput": {
        "type": "object",
        "required": [
            "order_id",
            "carrier",
            "tracking_code"
        ],
        "properties": {
            "order_id": {
                "type": "string",
                "pattern": "^[a-fA-F0-9]{24}$"
            },
            "carrier": {
                "type": "string",
                "enum": [
                    "GHN",
                    "GHTK",
                    "JT",
                    "GRAB",
                    "BEST",
                    "OTHER"
                ]
            },
            "tracking_code": {
                "type": "string",
                "minLength": 5,
                "maxLength": 100,
                "pattern": "^[A-Z0-9\\-_]+$"
            },
            "shipping_address": {
                "$ref": "#/components/schemas/ShippingAddress"
            }
        }
    },
    "UpdateShipmentStatusInput": {
        "type": "object",
        "required": [
            "status"
        ],
        "properties": {
            "status": {
                "type": "string",
                "enum": [
                    "pending",
                    "picked_up",
                    "in_transit",
                    "at_destination",
                    "delivered",
                    "cancelled",
                    "returned"
                ]
            },
            "notes": {
                "type": "string",
                "maxLength": 500
            }
        }
    },
    "RecordShipmentFailureInput": {
        "type": "object",
        "required": [
            "failure_reason",
            "failure_notes"
        ],
        "properties": {
            "failure_reason": {
                "type": "string",
                "enum": [
                    "address_incorrect",
                    "recipient_unavailable",
                    "refused_delivery",
                    "damaged_package",
                    "lost",
                    "weather_delay",
                    "carrier_error",
                    "other"
                ]
            },
            "failure_notes": {
                "type": "string",
                "maxLength": 500
            }
        }
    },
    "CancelShipmentInput": {
        "type": "object",
        "required": [
            "reason"
        ],
        "properties": {
            "reason": {
                "type": "string",
                "minLength": 5,
                "maxLength": 500
            }
        }
    },
    "AdminUpdateShipmentInput": {
        "type": "object",
        "properties": {
            "carrier": {
                "type": "string",
                "enum": [
                    "GHN",
                    "GHTK",
                    "JT",
                    "GRAB",
                    "BEST",
                    "OTHER"
                ]
            },
            "tracking_code": {
                "type": "string",
                "minLength": 5,
                "maxLength": 100,
                "pattern": "^[A-Z0-9\\-_]+$"
            },
            "admin_notes": {
                "type": "string",
                "maxLength": 1000
            }
        },
        "description": "If tracking_code is provided, carrier is required."
    },
    "ShipmentResponse": {
        "type": "object",
        "required": [
            "success",
            "data"
        ],
        "properties": {
            "success": {
                "type": "boolean"
            },
            "data": {
                "$ref": "#/components/schemas/ShipmentDTO"
            }
        }
    },
    "ShipmentsArrayResponse": {
        "type": "object",
        "required": [
            "success",
            "data"
        ],
        "properties": {
            "success": {
                "type": "boolean"
            },
            "data": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/ShipmentListDTO"
                }
            }
        }
    },
    "ShipmentsListResponse": {
        "type": "object",
        "required": [
            "success",
            "data",
            "pagination"
        ],
        "properties": {
            "success": {
                "type": "boolean"
            },
            "data": {
                "type": "array",
                "items": {
                    "$ref": "#/components/schemas/ShipmentListDTO"
                }
            },
            "pagination": {
                "$ref": "#/components/schemas/PaginationMeta"
            }
        }
    },
    "TrackingResponse": {
        "type": "object",
        "required": [
            "success",
            "data"
        ],
        "properties": {
            "success": {
                "type": "boolean"
            },
            "data": {
                "$ref": "#/components/schemas/TrackingDTO"
            }
        }
    }
};
