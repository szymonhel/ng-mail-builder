# NgMailBuilder

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## External sending API

External services can send saved emails without touching the app, authenticated by an **API key**.

Setup (once, in the app):

1. Open a category container → **Container settings → Integrations** → create an API key. Copy it immediately — it is shown only once. The key is **scoped to that category**: it can only send emails that belong to it.
2. Open the email you want to send → **Settings → Email ID** → copy the id (this is the `templateId`).

Endpoints available to a key (send it as an `X-Api-Key` header):

| Endpoint | Purpose |
|---|---|
| `POST /send/template` | Render a saved email (variables, collections, language) and send it via Mailjet |
| `GET /templates/{id}/contract` | Discover what the email accepts: variable names, collection fields, language codes |

Request body for `POST /send/template`:

```json
{
  "templateId": "3f6d3e0a-…",
  "to": "customer@example.com",
  "toName": "Jane Doe",
  "subject": "Order {{orderId}} confirmed",
  "language": "es",
  "variables": { "customerName": "Jane", "orderId": "ORD-1042" },
  "collections": {
    "items": [
      { "name": "Deluxe Suite", "price": "$450" },
      { "name": "Breakfast", "price": "$30" }
    ]
  }
}
```

Notes:

- `language` is optional — omit it for the email's default language. Unknown codes return `400` with the list of available codes (also visible in the contract).
- `variables` are optional — unprovided ones fall back to their default values, layered with account/category global data. Provided values always win. The `subject` also gets `{{token}}` substitution.
- `collections` fill repeat blocks (repeated rows, table body rows, accordion items). A missing collection renders zero items — the in-editor sample data is never sent to a real recipient.
- Responses: `200 {"success":true}` · `400` validation error · `401` invalid key · `403` email belongs to a different category than the key · `404` unknown `templateId`.
- Every attempt (success or failure, app or API) is logged in the app under **Sent history**, including which API key sent it and the variables it provided.

### .NET example

Works on .NET 6+ (no external packages — `HttpClient` + `System.Text.Json`):

```csharp
using System.Net.Http.Json;
using System.Text.Json;

public sealed record SendTemplateRequest(
    string TemplateId,
    string To,
    string Subject,
    string? ToName = null,
    string? Language = null,
    Dictionary<string, string>? Variables = null,
    Dictionary<string, List<Dictionary<string, string>>>? Collections = null);

public sealed class MailBuilderClient
{
    // JsonSerializerDefaults.Web serializes the PascalCase properties as the
    // camelCase field names the API expects (templateId, toName, …).
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _http;

    public MailBuilderClient(HttpClient http, string apiKey)
    {
        _http = http;
        _http.DefaultRequestHeaders.Add("X-Api-Key", apiKey);
    }

    public async Task SendAsync(SendTemplateRequest request, CancellationToken ct = default)
    {
        using var response = await _http.PostAsJsonAsync("/send/template", request, Json, ct);
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException(
                $"Mail send failed ({(int)response.StatusCode}): {error}");
        }
    }

    // Variable names, collection fields and language codes the template accepts.
    public async Task<JsonDocument> GetContractAsync(string templateId, CancellationToken ct = default)
    {
        var json = await _http.GetStringAsync(
            $"/templates/{Uri.EscapeDataString(templateId)}/contract", ct);
        return JsonDocument.Parse(json);
    }
}
```

Usage:

```csharp
var http = new HttpClient { BaseAddress = new Uri("https://your-api.example.com") };
var mail = new MailBuilderClient(http, Environment.GetEnvironmentVariable("MAILBUILDER_API_KEY")!);

await mail.SendAsync(new SendTemplateRequest(
    TemplateId: "3f6d3e0a-…",
    To: "customer@example.com",
    ToName: "Jane Doe",
    Subject: "Order {{orderId}} confirmed",
    Language: "es",
    Variables: new()
    {
        ["customerName"] = "Jane",
        ["orderId"] = "ORD-1042",
    },
    Collections: new()
    {
        ["items"] = new()
        {
            new() { ["name"] = "Deluxe Suite", ["price"] = "$450" },
            new() { ["name"] = "Breakfast", ["price"] = "$30" },
        },
    }));
```

In an ASP.NET Core app, register it with `IHttpClientFactory` instead of newing up `HttpClient`:

```csharp
builder.Services.AddHttpClient<MailBuilderClient>(http =>
    http.BaseAddress = new Uri(builder.Configuration["MailBuilder:BaseUrl"]!))
  .AddTypedClient((http, sp) =>
    new MailBuilderClient(http, builder.Configuration["MailBuilder:ApiKey"]!));
```

Keep the API key out of source control (environment variable, user-secrets, or Key Vault), and note that revoking the key in the app stops the integration immediately.

The equivalent `curl`, for quick testing:

```bash
curl -X POST https://your-api.example.com/send/template \
  -H "X-Api-Key: mbk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "3f6d3e0a-…",
    "to": "customer@example.com",
    "subject": "Order {{orderId}} confirmed",
    "language": "es",
    "variables": { "customerName": "Jane", "orderId": "ORD-1042" },
    "collections": { "items": [ { "name": "Deluxe Suite", "price": "$450" } ] }
  }'
```
