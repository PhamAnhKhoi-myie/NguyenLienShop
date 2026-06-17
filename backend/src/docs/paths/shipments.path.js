

module.exports = {
    "/shipments/track/{tracking_code}": {
        "get": {
            "tags": [
                "Shipments"
            ],
            "summary": "Track shipment by tracking code",
            "description": "Track shipments publicly (no authentication required). Get shipping information by tracking code.",
            "security": [],
            "parameters": [
                {
                    "name": "tracking_code",
                    "in": "path",
                    "required": true,
                    "schema": {
                        "type": "string"
                    },
                    "description": "Carrier tracking code"
                }
            ],
            "responses": {
                "200": {
                    "description": "Shipment tracking information",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/TrackingDTO"
                            }
                        }
                    }
                },
                "404": {
                    "$ref": "#/components/responses/NotFound"
                }
            }
        }
    },
    "/shipments/webhook/{carrier}": {
        "post": {
            "tags": [
                "Shipments"
            ],
            "summary": "Carrier webhook for status updates",
            "description": "Carrier webhook to receive shipping updates. No authentication required.",
            "security": [],
            "parameters": [
                {
                    "name": "carrier",
                    "in": "path",
                    "required": true,
                    "schema": {
                        "type": "string",
                        "enum": [
                            "GHN",
                            "GHTK",
                            "JT",
                            "GRAB",
                            "BEST",
                            "OTHER"
                        ]
                    }
                }
            ],
            "requestBody": {
                "required": true,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": [
                                "tracking_code",
                                "status",
                                "signature"
                            ],
                            "properties": {
                                "tracking_code": {
                                    "type": "string"
                                },
                                "status": {
                                    "type": "string"
                                },
                                "signature": {
                                    "type": "string"
                                },
                                "carrier_details": {
                                    "type": "object"
                                },
                                "timestamp": {
                                    "type": "number"
                                }
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Webhook processed successfully",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {
                                        "type": "boolean"
                                    }
                                }
                            }
                        }
                    }
                },
                "400": {
                    "$ref": "#/components/responses/BadRequest"
                }
            }
        }
    },
    "/shipments/{shipmentId}": {
        "get": {
            "tags": [
                "Shipments"
            ],
            "summary": "Get shipment details",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "parameters": [
                {
                    "name": "shipmentId",
                    "in": "path",
                    "required": true,
                    "schema": {
                        "type": "string",
                        "pattern": "^[a-fA-F0-9]{24}$"
                    }
                }
            ],
            "responses": {
                "200": {
                    "description": "Shipment details",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShipmentResponse"
                            }
                        }
                    }
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                },
                "404": {
                    "$ref": "#/components/responses/NotFound"
                }
            }
        }
    },
    "/shipments/order/{orderId}": {
        "get": {
            "tags": [
                "Shipments"
            ],
            "summary": "Get shipments for order",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "parameters": [
                {
                    "name": "orderId",
                    "in": "path",
                    "required": true,
                    "schema": {
                        "type": "string",
                        "pattern": "^[a-fA-F0-9]{24}$"
                    }
                }
            ],
            "responses": {
                "200": {
                    "description": "Order shipments",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShipmentsArrayResponse"
                            }
                        }
                    }
                },
                "400": {
                    "$ref": "#/components/responses/BadRequest"
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                },
                "404": {
                    "$ref": "#/components/responses/NotFound"
                }
            }
        }
    },
    "/shipments": {
        "get": {
            "tags": [
                "Shipments"
            ],
            "summary": "List user shipments",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "parameters": [
                {
                    "name": "page",
                    "in": "query",
                    "schema": {
                        "type": "integer",
                        "default": 1
                    }
                },
                {
                    "name": "limit",
                    "in": "query",
                    "schema": {
                        "type": "integer",
                        "default": 20,
                        "maximum": 100
                    }
                },
                {
                    "name": "status",
                    "in": "query",
                    "schema": {
                        "type": "string"
                    },
                    "description": "Comma-separated status values"
                },
                {
                    "name": "carrier",
                    "in": "query",
                    "schema": {
                        "type": "string",
                        "enum": [
                            "GHN",
                            "GHTK",
                            "JT",
                            "GRAB",
                            "BEST",
                            "OTHER"
                        ]
                    }
                },
                {
                    "name": "date_from",
                    "in": "query",
                    "schema": {
                        "type": "string",
                        "format": "date-time"
                    }
                },
                {
                    "name": "date_to",
                    "in": "query",
                    "schema": {
                        "type": "string",
                        "format": "date-time"
                    }
                }
            ],
            "responses": {
                "200": {
                    "description": "List of shipments",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShipmentsListResponse"
                            }
                        }
                    }
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                }
            }
        },
        "post": {
            "tags": [
                "Shipments"
            ],
            "summary": "Create shipment (admin only)",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "requestBody": {
                "required": true,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/CreateShipmentInput"
                        }
                    }
                }
            },
            "responses": {
                "201": {
                    "description": "Shipment created",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShipmentResponse"
                            }
                        }
                    }
                },
                "400": {
                    "$ref": "#/components/responses/BadRequest"
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                }
            }
        }
    },
    "/shipments/{shipmentId}/status": {
        "patch": {
            "tags": [
                "Shipments"
            ],
            "summary": "Update shipment status (admin only)",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "parameters": [
                {
                    "name": "shipmentId",
                    "in": "path",
                    "required": true,
                    "schema": {
                        "type": "string",
                        "pattern": "^[a-fA-F0-9]{24}$"
                    }
                }
            ],
            "requestBody": {
                "required": true,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/UpdateShipmentStatusInput"
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Status updated",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShipmentResponse"
                            }
                        }
                    }
                },
                "400": {
                    "$ref": "#/components/responses/BadRequest"
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                },
                "409": {
                    "$ref": "#/components/responses/Conflict"
                }
            }
        }
    },
    "/shipments/{shipmentId}/failure": {
        "patch": {
            "tags": [
                "Shipments"
            ],
            "summary": "Record delivery failure (admin only)",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "parameters": [
                {
                    "name": "shipmentId",
                    "in": "path",
                    "required": true,
                    "schema": {
                        "type": "string",
                        "pattern": "^[a-fA-F0-9]{24}$"
                    }
                }
            ],
            "requestBody": {
                "required": true,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/RecordShipmentFailureInput"
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Failure recorded",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShipmentResponse"
                            }
                        }
                    }
                },
                "400": {
                    "$ref": "#/components/responses/BadRequest"
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                }
            }
        }
    },
    "/shipments/{shipmentId}/retry": {
        "post": {
            "tags": [
                "Shipments"
            ],
            "summary": "Retry failed shipment",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "parameters": [
                {
                    "name": "shipmentId",
                    "in": "path",
                    "required": true,
                    "schema": {
                        "type": "string",
                        "pattern": "^[a-fA-F0-9]{24}$"
                    }
                }
            ],
            "responses": {
                "200": {
                    "description": "Shipment retry initiated",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShipmentResponse"
                            }
                        }
                    }
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                },
                "409": {
                    "$ref": "#/components/responses/Conflict"
                }
            }
        }
    },
    "/shipments/{shipmentId}/cancel": {
        "patch": {
            "tags": [
                "Shipments"
            ],
            "summary": "Cancel shipment",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "parameters": [
                {
                    "name": "shipmentId",
                    "in": "path",
                    "required": true,
                    "schema": {
                        "type": "string",
                        "pattern": "^[a-fA-F0-9]{24}$"
                    }
                }
            ],
            "requestBody": {
                "required": true,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/CancelShipmentInput"
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Shipment cancelled",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShipmentResponse"
                            }
                        }
                    }
                },
                "400": {
                    "$ref": "#/components/responses/BadRequest"
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                }
            }
        }
    },
    "/shipments/{shipmentId}/confirm-delivery": {
        "post": {
            "tags": [
                "Shipments"
            ],
            "summary": "Confirm delivery (admin only)",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "parameters": [
                {
                    "name": "shipmentId",
                    "in": "path",
                    "required": true,
                    "schema": {
                        "type": "string",
                        "pattern": "^[a-fA-F0-9]{24}$"
                    }
                }
            ],
            "responses": {
                "200": {
                    "description": "",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShipmentResponse"
                            }
                        }
                    }
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                },
                "409": {
                    "$ref": "#/components/responses/Conflict"
                }
            }
        }
    },
    "/shipments/admin": {
        "get": {
            "tags": [
                "Shipments"
            ],
            "summary": "List all shipments (admin only)",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "parameters": [
                {
                    "name": "page",
                    "in": "query",
                    "schema": {
                        "type": "integer",
                        "default": 1
                    }
                },
                {
                    "name": "limit",
                    "in": "query",
                    "schema": {
                        "type": "integer",
                        "default": 20
                    }
                },
                {
                    "name": "status",
                    "in": "query",
                    "schema": {
                        "type": "string"
                    }
                },
                {
                    "name": "carrier",
                    "in": "query",
                    "schema": {
                        "type": "string"
                    }
                },
                {
                    "name": "user_id",
                    "in": "query",
                    "schema": {
                        "type": "string",
                        "pattern": "^[a-fA-F0-9]{24}$"
                    }
                },
                {
                    "name": "order_id",
                    "in": "query",
                    "schema": {
                        "type": "string",
                        "pattern": "^[a-fA-F0-9]{24}$"
                    }
                },
                {
                    "name": "date_from",
                    "in": "query",
                    "schema": {
                        "type": "string",
                        "format": "date-time"
                    }
                },
                {
                    "name": "date_to",
                    "in": "query",
                    "schema": {
                        "type": "string",
                        "format": "date-time"
                    }
                }
            ],
            "responses": {
                "200": {
                    "description": "All shipments",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShipmentsListResponse"
                            }
                        }
                    }
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                },
                "403": {
                    "$ref": "#/components/responses/Forbidden"
                }
            }
        }
    },
    "/shipments/admin/{shipmentId}": {
        "get": {
            "tags": [
                "Shipments"
            ],
            "summary": "Get admin shipment detail",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "parameters": [
                {
                    "name": "shipmentId",
                    "in": "path",
                    "required": true,
                    "schema": {
                        "type": "string",
                        "pattern": "^[a-fA-F0-9]{24}$"
                    }
                }
            ],
            "responses": {
                "200": {
                    "description": "Shipment details",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShipmentResponse"
                            }
                        }
                    }
                },
                "400": {
                    "$ref": "#/components/responses/BadRequest"
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                },
                "403": {
                    "$ref": "#/components/responses/Forbidden"
                },
                "404": {
                    "$ref": "#/components/responses/NotFound"
                }
            }
        },
        "patch": {
            "tags": [
                "Shipments"
            ],
            "summary": "Admin update shipment",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "parameters": [
                {
                    "name": "shipmentId",
                    "in": "path",
                    "required": true,
                    "schema": {
                        "type": "string",
                        "pattern": "^[a-fA-F0-9]{24}$"
                    }
                }
            ],
            "requestBody": {
                "required": true,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/AdminUpdateShipmentInput"
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Shipment updated",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShipmentResponse"
                            }
                        }
                    }
                },
                "400": {
                    "$ref": "#/components/responses/BadRequest"
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                },
                "403": {
                    "$ref": "#/components/responses/Forbidden"
                },
                "404": {
                    "$ref": "#/components/responses/NotFound"
                }
            }
        },
        "delete": {
            "tags": [
                "Shipments"
            ],
            "summary": "Soft delete shipment",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "parameters": [
                {
                    "name": "shipmentId",
                    "in": "path",
                    "required": true,
                    "schema": {
                        "type": "string",
                        "pattern": "^[a-fA-F0-9]{24}$"
                    }
                }
            ],
            "responses": {
                "200": {
                    "description": "Shipment deleted",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShipmentResponse"
                            }
                        }
                    }
                },
                "400": {
                    "$ref": "#/components/responses/BadRequest"
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                },
                "403": {
                    "$ref": "#/components/responses/Forbidden"
                },
                "404": {
                    "$ref": "#/components/responses/NotFound"
                }
            }
        }
    },
    "/shipments/admin/stats": {
        "get": {
            "tags": [
                "Shipments"
            ],
            "summary": "Get shipment statistics (admin only)",
            "security": [
                {
                    "bearerAuth": []
                }
            ],
            "responses": {
                "200": {
                    "description": "Shipment statistics",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {
                                        "type": "boolean"
                                    },
                                    "data": {
                                        "type": "object"
                                    }
                                }
                            }
                        }
                    }
                },
                "401": {
                    "$ref": "#/components/responses/Unauthorized"
                }
            }
        }
    }
};
