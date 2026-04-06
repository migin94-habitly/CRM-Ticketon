// Package docs contains Swagger documentation.
// Run `swag init -g cmd/server/main.go -o docs` to regenerate.
package docs

import "github.com/swaggo/swag"

const docTemplate = `{
    "swagger": "2.0",
    "info": {
        "title": "CRM Ticketon API",
        "description": "Sales CRM system with telephony, WhatsApp, and AI analytics",
        "version": "1.0",
        "contact": {"email": "support@crm-ticketon.local"}
    },
    "host": "localhost:8080",
    "basePath": "/api/v1",
    "schemes": ["http", "https"],
    "paths": {}
}`

// SwaggerInfo holds exported Swagger Info
var SwaggerInfo = &swag.Spec{
	Version:          "1.0",
	Host:             "localhost:8080",
	BasePath:         "/api/v1",
	Schemes:          []string{},
	Title:            "CRM Ticketon API",
	Description:      "Sales CRM system with telephony, WhatsApp, and AI analytics",
	InfoInstanceName: "swagger",
	SwaggerTemplate:  docTemplate,
}

func init() {
	swag.Register(SwaggerInfo.InstanceName(), SwaggerInfo)
}
