---
id: mcp-architecture
title: MCP Architecture Notes
type: research
tags:
  - mcp
  - architecture
  - ai
status: published
author: asep
created_at: 2026-08-19
updated_at: 2026-08-19
---

# MCP Architecture Notes

The Model Context Protocol (MCP) lets an AI client treat a knowledge base as a
first-class context source instead of yet another REST API. The server exposes
tools and resources; the client decides what to read.

## Tools vs resources

- Tools are actions the model calls (`search_documents`, `get_document`).
- Resources are addressable content the model can pull (`mcpedia://docs/...`).

## Why it matters here

MCPedia exposes both. The Web UI is for humans; the MCP server is for agents.
Both go through the same Core layer, so there is exactly one copy of the
business logic and one search implementation.

## Reference

Related reading: the WebSocket contract and the tRPC type-safe API notes.
