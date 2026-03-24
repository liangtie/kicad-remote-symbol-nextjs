import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const metadata = {
    provider_name: "Remote Symbol Provider",
    provider_version: "1.0.0",
    api_base_url: "https://localhost:3000/api",
    panel_url: "http://localhost:3000/kicadLibrary",
    session_bootstrap_url: "https://localhost:3000/api/session/bootstrap",
    auth: {
      type: "none"
    },
    capabilities: {
      web_ui_v1: true,
      parts_v1: true,
      direct_downloads_v1: true,
      inline_payloads_v1: true
    },
    max_download_bytes: 104857600, // 100MB
    supported_asset_types: ["symbol", "footprint", "3dmodel"],
    parts: {
      endpoint_template: "/parts/{part_id}"
    },
    documentation_url: "https://example.com/documentation",
    terms_url: "https://example.com/terms",
    privacy_url: "https://example.com/privacy",
    allow_insecure_localhost: true
  };

  return NextResponse.json(metadata);
}
