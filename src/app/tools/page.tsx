"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plug, Circle, ExternalLink, ArrowRight, Loader2, Zap, Globe, Shield,
  RefreshCw, Lock, Key, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Integration {
  name: string;
  status: string;
  description: string;
  category: string;
  authType?: string;
  oauthScopes?: string[];
  actions?: string[];
  useInSkills?: string[];
  connectionId?: string | null;
  composioStatus?: string | null;
}

interface IntegrationsData {
  provider: string;
  authModel: string;
  composioConfigured: boolean;
  description: string;
  integrations: Integration[];
}

const LOGO_URLS: Record<string, string> = {
  perplexity: "https://cdn.simpleicons.org/perplexity/1FB8CD",
  gmail: "https://cdn.simpleicons.org/gmail/EA4335",
  "google-sheets": "https://cdn.simpleicons.org/googlesheets/34A853",
  slack: "https://cdn.simpleicons.org/slack/4A154B",
  notion: "https://cdn.simpleicons.org/notion/000000",
  github: "https://cdn.simpleicons.org/github/181717",
  linear: "https://cdn.simpleicons.org/linear/5E6AD2",
  salesforce: "https://cdn.simpleicons.org/salesforce/00A1E0",
  jira: "https://cdn.simpleicons.org/jira/0052CC",
  "google-drive": "https://cdn.simpleicons.org/googledrive/4285F4",
  airtable: "https://cdn.simpleicons.org/airtable/18BFFF",
};

const CATEGORY_LABELS: Record<string, string> = {
  research: "Research & Intelligence",
  communication: "Communication",
  data: "Data & Storage",
  knowledge: "Knowledge",
  development: "Development",
  "project-management": "Project Management",
  crm: "CRM & Sales",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  connected: { label: "Connected", color: "text-success", bgColor: "bg-success/10", icon: CheckCircle2 },
  pending: { label: "Pending", color: "text-blue-600", bgColor: "bg-blue-500/10", icon: Clock },
  requires_setup: { label: "Not Connected", color: "text-warning", bgColor: "bg-warning/10", icon: AlertCircle },
  available: { label: "Available", color: "text-muted-foreground", bgColor: "bg-black/[0.04]", icon: Circle },
};

const AUTH_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  oauth2: { label: "OAuth 2.0", icon: Lock },
  api_key: { label: "API Key", icon: Key },
};

function IntegrationLogo({ name }: { name: string }) {
  const url = LOGO_URLS[name];
  return (
    <div className="w-11 h-11 rounded-xl glass-card flex items-center justify-center flex-shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt={name} className="w-6 h-6 object-contain" /> : <Globe className="w-5 h-5 text-muted-foreground" />}
    </div>
  );
}

function IntegrationCard({ integration, onConnect }: { integration: Integration; onConnect: (name: string) => void }) {
  const statusCfg = STATUS_CONFIG[integration.status] || STATUS_CONFIG.available;
  const StatusIcon = statusCfg.icon;
  const authCfg = AUTH_LABELS[integration.authType || "oauth2"] || AUTH_LABELS.oauth2;
  const AuthIcon = authCfg.icon;
  const isConnected = integration.status === "connected";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative rounded-xl p-5 transition-all duration-200 glass-card",
        isConnected && "ring-1 ring-success/20",
        integration.status === "pending" && "ring-1 ring-blue-500/15",
        integration.status === "requires_setup" && "ring-1 ring-warning/10"
      )}
    >
      <div className="flex items-start gap-4">
        <IntegrationLogo name={integration.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground capitalize">{integration.name.replace(/-/g, " ")}</h3>
            <span className={cn("flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", statusCfg.color, statusCfg.bgColor)}>
              <StatusIcon className="w-2.5 h-2.5" /> {statusCfg.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">{integration.description}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium text-muted-foreground/60 bg-black/[0.03] px-2 py-0.5 rounded-lg">
              {CATEGORY_LABELS[integration.category] || integration.category}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
              <AuthIcon className="w-2.5 h-2.5" /> {authCfg.label}
            </span>
            {integration.actions && integration.actions.length > 0 && (
              <span className="text-[10px] text-muted-foreground/40">
                {integration.actions.length} action{integration.actions.length > 1 ? "s" : ""}
              </span>
            )}
            {isConnected && integration.composioStatus && (
              <span className="text-[10px] text-success/60 font-mono">{integration.composioStatus}</span>
            )}
            {(integration.status === "requires_setup" || integration.status === "available") && (
              <button onClick={() => onConnect(integration.name)} className="text-[10px] font-semibold text-primary hover:text-primary/80 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                Connect via Composio <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

type FilterKey = "all" | "connected" | "requires_setup" | "available";

export default function ToolsConfig() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [connecting, setConnecting] = useState<string | null>(null);
  const [data, setData] = useState<IntegrationsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/integrations");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to fetch integrations", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const integrations = data?.integrations || [];
  const filtered = filter === "all" ? integrations : integrations.filter((i) => i.status === filter);

  const connectedCount = integrations.filter((i) => i.status === "connected").length;
  const pendingCount = integrations.filter((i) => i.status === "pending").length;
  const setupCount = integrations.filter((i) => i.status === "requires_setup").length;
  const availableCount = integrations.filter((i) => i.status === "available").length;

  async function handleConnect(appName: string) {
    setConnecting(appName);
    try {
      const res = await fetch("/api/agent/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName, redirectUrl: window.location.href }),
      });
      const result = await res.json();
      if (result.redirectUrl) {
        window.open(result.redirectUrl, "_blank", "width=600,height=700");
        setTimeout(() => refetch(), 5000);
      }
    } catch (e) {
      console.error("Connect failed:", e);
    } finally {
      setConnecting(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Plug className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tools & Config</h1>
          {data?.composioConfigured && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full ml-auto">
              <CheckCircle2 className="w-2.5 h-2.5" /> Composio API Connected
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Live connection status from Composio — managed OAuth, API keys, and tool execution
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Integration Provider</span>
          </div>
          <p className="text-lg font-bold text-foreground capitalize">{data?.provider || "Composio"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">1000+ tools via Model Context Protocol</p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Auth Model</span>
          </div>
          <p className="text-lg font-bold text-foreground capitalize">{(data?.authModel || "oauth-per-user").replace(/-/g, " ")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Composio manages OAuth flows and token refresh</p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Live Status</span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <div>
              <p className="text-xl font-bold text-success">{connectedCount}</p>
              <p className="text-[10px] text-muted-foreground">Connected</p>
            </div>
            {pendingCount > 0 && (
              <>
                <div className="h-8 w-px bg-black/[0.06]" />
                <div>
                  <p className="text-xl font-bold text-blue-600">{pendingCount}</p>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
              </>
            )}
            <div className="h-8 w-px bg-black/[0.06]" />
            <div>
              <p className="text-xl font-bold text-warning">{setupCount}</p>
              <p className="text-[10px] text-muted-foreground">Not Connected</p>
            </div>
            <div className="h-8 w-px bg-black/[0.06]" />
            <div>
              <p className="text-xl font-bold text-muted-foreground">{availableCount}</p>
              <p className="text-[10px] text-muted-foreground">Available</p>
            </div>
          </div>
        </div>
      </div>

      <div className="phase-context-banner rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">GitAgent Standard + Composio MCP Architecture</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">
              This agent follows the <span className="font-semibold text-foreground">GitAgent</span> standard — agent definitions (SOUL.md, RULES.md, skills/) are version-controlled. External tool access uses{" "}
              <span className="font-semibold text-foreground">Composio&apos;s REST API</span>{" "}
              (<code className="text-[10px] font-mono bg-black/[0.04] px-1 rounded">backend.composio.dev/api/v1</code>) authenticated with{" "}
              <code className="text-[10px] font-mono bg-black/[0.04] px-1 rounded">COMPOSIO_API_KEY</code>. Connection status shown here is live from Composio.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              {[
                { title: "1. Skill triggers action", body: 'When a skill needs an external tool (e.g., "send survey via Gmail"), it calls a Composio action like', code: "GMAIL_SEND_EMAIL" },
                { title: "2. Composio checks auth", body: "Composio checks", code: "connectedAccounts", suffix: " for this entity. If no active connection, it returns an OAuth redirect URL." },
                { title: "3. Tool executes", body: "With ACTIVE status, Composio calls the external API using stored credentials via", code: "POST /v2/actions/execute", suffix: ". Credentials never exposed to the agent." },
              ].map((step) => (
                <div key={step.title} className="bg-white/30 rounded-lg p-3 border border-black/[0.04]">
                  <div className="text-xs font-semibold text-foreground mb-1">{step.title}</div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {step.body}{" "}
                    <code className="text-[10px] font-mono bg-black/[0.04] px-1 rounded">{step.code}</code>
                    {step.suffix}
                  </p>
                </div>
              ))}
            </div>
            <a href="https://composio.dev" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 mt-3 transition-colors">
              Learn more about Composio <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {([
          { key: "all" as FilterKey, label: `All (${integrations.length})` },
          { key: "connected" as FilterKey, label: `Connected (${connectedCount})` },
          { key: "requires_setup" as FilterKey, label: `Not Connected (${setupCount})` },
          { key: "available" as FilterKey, label: `Available (${availableCount})` },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === tab.key ? "bg-primary text-white" : "bg-black/[0.04] text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
        <button onClick={refetch} className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((integration) => (
            <IntegrationCard key={integration.name} integration={integration} onConnect={handleConnect} />
          ))}
        </AnimatePresence>
      </div>

      {connecting && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="glass-card rounded-2xl p-8 max-w-sm mx-auto text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">Connecting {connecting.replace(/-/g, " ")}...</p>
            <p className="text-xs text-muted-foreground">Composio is preparing the OAuth flow</p>
          </div>
        </div>
      )}
    </div>
  );
}
