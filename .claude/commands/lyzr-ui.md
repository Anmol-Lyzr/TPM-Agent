# Lyzr UI — Build or Migrate to the Lyzr Design System

Apply the Lyzr AgenticOS design system to either **migrate an existing frontend** or **build a new UI from scratch**. This skill encodes every design decision from the reference implementation at `RPT-central-component-registry-frontend`.

---

## How to use this skill

Invoked as `/lyzr-ui` followed by one of:
- `/lyzr-ui migrate` — audit the current codebase and convert it to the Lyzr design system
- `/lyzr-ui new <description>` — scaffold a new Next.js app matching the design system
- `/lyzr-ui component <name>` — generate a single component following the design system

If no sub-command is given, ask the user whether they want to migrate, build new, or generate a component.

---

## Reference implementation

The canonical source is at:
```
/Users/anmolvarshney/Downloads/Lyzr Project/TPM Agent/RPT-central-component-registry-frontend
```

Always read files from there when you need to copy exact code. Do NOT hallucinate component implementations — read the source.

Key files to reference:
- `src/app/globals.css` — complete design token definitions + utility classes
- `src/app/layout.tsx` — font setup + root layout
- `src/components/sidebar/SidebarLayout.tsx` + `src/components/ui/app-sidebar.tsx` — navigation shell
- `src/components/ui/site-header.tsx` — top header
- `src/app/page.tsx` — dashboard pattern
- `src/app/console/page.tsx` — chat/agent console pattern
- `src/app/settings/page.tsx` — settings + table pattern
- `src/app/tools/page.tsx` — integrations/cards grid pattern
- `src/components/journey-layout.tsx` — split-pane form+output pattern
- `src/components/dashboard/*.tsx` — individual card components
- `src/components/logo/Logo.tsx` — SVG logo

---

## Design system specification

### 1. Color tokens (CSS variables — copy verbatim into `globals.css`)

```css
:root {
  --background: 35 40% 94%;       /* #F6F1EA warm cream */
  --foreground: 23 35% 13%;       /* #2E1F16 dark brown */
  --card: 36 46% 97%;             /* #FBF8F4 near-white warm */
  --card-foreground: 23 35% 13%;
  --popover: 36 46% 97%;
  --popover-foreground: 23 35% 13%;
  --primary: 26 55% 31%;          /* #7B4A24 warm brown */
  --primary-foreground: 35 40% 94%;
  --secondary: 30 12% 48%;        /* #8A7B6C muted warm-gray */
  --secondary-foreground: 35 40% 94%;
  --muted: 32 29% 87%;
  --muted-foreground: 30 12% 48%;
  --accent: 23 48% 20%;           /* #4A2C1A dark brown */
  --accent-foreground: 35 40% 94%;
  --destructive: 0 84% 55%;
  --destructive-foreground: 0 0% 100%;
  --success: 152 60% 40%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;
  --warning-foreground: 23 35% 13%;
  --border: 32 29% 87%;           /* #E7DED4 */
  --input: 32 29% 87%;
  --ring: 26 55% 31%;
  --radius: 1rem;
  --chart-1: 26 55% 31%;
  --chart-2: 30 34% 49%;
  --chart-3: 23 48% 20%;
  --chart-4: 29 57% 64%;
  --chart-5: 23 65% 35%;
  --sidebar: 32 31% 93%;          /* #F3EEE8 */
  --sidebar-foreground: 27 24% 30%;
  --sidebar-primary: 24 36% 18%;
  --sidebar-primary-foreground: 35 40% 94%;
  --sidebar-accent: 32 31% 87%;   /* #E8DED3 active item bg */
  --sidebar-accent-foreground: 24 36% 18%;
  --sidebar-border: 32 28% 87%;
  --sidebar-ring: 26 55% 31%;
}
```

### 2. Typography

Three Google Font families — load via `next/font/google`:

```tsx
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-inter', display: 'swap' });
const playfairDisplay = Playfair_Display({ subsets: ['latin'], weight: ['400','500','600','700','800','900'], variable: '--font-playfair', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400','500'], variable: '--font-jetbrains', display: 'swap' });
```

Apply to `<body>` className: `${inter.variable} ${playfairDisplay.variable} ${jetbrainsMono.variable} antialiased`

CSS rules:
```css
body { font-size: 14px; line-height: 1.5; letter-spacing: -0.01em; }
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-serif), 'Playfair Display', Georgia, serif;
  letter-spacing: -0.02em;
}
```

Font semantic mapping:
- `font-sans` → Inter — body text, labels, UI
- `font-serif` → Playfair Display — all headings (applied globally to h*)
- `font-mono` → JetBrains Mono — code blocks, data values, file names, metric numbers

### 3. Utility classes (copy into `globals.css`)

**Background grid pattern:**
```css
.app-bg {
  background:
    linear-gradient(hsla(30, 20%, 60%, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, hsla(30, 20%, 60%, 0.07) 1px, transparent 1px),
    radial-gradient(ellipse at 20% 0%, hsla(30, 40%, 90%, 0.5) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, hsla(24, 35%, 88%, 0.4) 0%, transparent 50%),
    hsl(35, 40%, 94%);
  background-size: 32px 32px, 32px 32px, 100% 100%, 100% 100%, 100% 100%;
}
```

**Glass effects:**
```css
.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.03), 0 1px 4px rgba(0, 0, 0, 0.02);
}
.glass-card:hover { box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.03); }

.glass-dark {
  background: rgba(20, 13, 8, 0.98);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.glass-input {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.07);
  transition: all 0.2s ease;
}
.glass-input:focus {
  background: rgba(255, 255, 255, 0.85);
  border-color: hsla(24, 58%, 25%, 0.35);
  box-shadow: 0 0 0 3px hsla(24, 58%, 25%, 0.1);
}

.phase-context-banner {
  background: hsla(24, 40%, 50%, 0.08);
  border: 1px solid hsla(24, 40%, 50%, 0.12);
  backdrop-filter: blur(8px);
}
```

**Scrollbar:**
```css
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: hsla(24, 20%, 50%, 0.18); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: hsla(24, 20%, 50%, 0.3); }
```

**Sidebar overrides:**
```css
[data-sidebar="group-label"] {
  color: hsl(26, 33%, 54%);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
[data-sidebar="menu-button"] { border-radius: 10px !important; }
```

### 4. Required packages

```json
{
  "dependencies": {
    "next": "^15.1.7",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "framer-motion": "^12.x",
    "lucide-react": "latest",
    "@tabler/icons-react": "latest",
    "react-markdown": "latest",
    "remark-gfm": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "class-variance-authority": "latest",
    "sonner": "^1.7",
    "@reduxjs/toolkit": "^2.5",
    "react-hook-form": "^7.54",
    "zod": "^3.24",
    "recharts": "^2.15"
  },
  "devDependencies": {
    "tailwindcss": "^4.1",
    "tailwindcss-animate": "latest",
    "@types/react": "latest",
    "@types/node": "latest",
    "typescript": "^5"
  }
}
```

shadcn/ui components needed: button, card, badge, avatar, dialog, dropdown-menu, form, input, label, select, separator, sheet, sidebar, skeleton, tabs, table, toast, tooltip, scroll-area, popover, checkbox, textarea, toggle, pagination.

---

## Component patterns

### Layout shell

The root layout wraps everything in `SidebarProvider` → `AppSidebar` + `SidebarInset`:

```tsx
// src/app/layout.tsx
<html lang="en">
  <body className={`${inter.variable} ${playfairDisplay.variable} ${jetbrainsMono.variable} antialiased`}>
    <StoreProvider>
      <SidebarLayout>{children}</SidebarLayout>
    </StoreProvider>
  </body>
</html>

// src/components/sidebar/SidebarLayout.tsx
<SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 68)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
  <AppSidebar variant="sidebar" />
  <SidebarInset>
    <SiteHeader />
    {children}
  </SidebarInset>
</SidebarProvider>
```

### Sidebar structure

```tsx
// AppSidebar — collapsible="offcanvas", uses Tabler icons
<Sidebar collapsible="offcanvas">
  <SidebarHeader>
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
          <Link href="/"><Logo /><span className="text-base font-semibold">App Name</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarHeader>
  <SidebarContent>
    <NavMain items={topNavItems} />
    {/* Optional: NavJourneys for workflow steps */}
    <NavMain items={toolsItems} />
    <NavSecondary items={secondaryItems} className="mt-auto" />
  </SidebarContent>
  <SidebarFooter>
    <NavUser user={userObject} />
  </SidebarFooter>
</Sidebar>
```

Nav item shape: `{ title: string; url: string; icon: TablerIconComponent; subItems?: NavItem[] }`

### Page header

```tsx
<div className="p-4 md:p-8 max-w-4xl mx-auto">
  <div className="mb-8">
    <div className="flex items-center gap-3 mb-1">
      <PageIcon className="w-6 h-6 text-primary" />
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Page Title</h1>
    </div>
    <p className="text-sm text-muted-foreground">Subtitle describing the page purpose</p>
  </div>
  {/* page content */}
</div>
```

### Stat cards row (3-column)

```tsx
<div className="grid grid-cols-3 gap-3 mb-6">
  {stats.map(stat => {
    const Icon = stat.icon;
    return (
      <div key={stat.label} className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className={cn("p-1.5 rounded-lg", stat.bg)}>
            <Icon className={cn("w-3.5 h-3.5", stat.color)} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
      </div>
    );
  })}
</div>
```

### Glass card with section header

```tsx
<div className="glass-card rounded-xl overflow-hidden mb-6">
  <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.05]">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-primary" />
      <h2 className="text-sm font-semibold text-foreground">Section Title</h2>
    </div>
    {/* Optional: action button in justify-between */}
  </div>
  <div className="p-5">
    {/* content */}
  </div>
</div>
```

### Data table (list with dividers)

```tsx
<div className="glass-card rounded-xl overflow-hidden">
  {/* header above */}
  <div className="divide-y divide-black/[0.04]">
    <AnimatePresence>
      {items.map(item => (
        <motion.div key={item.id}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-4 px-5 py-3.5"
        >
          {/* row content */}
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
</div>
```

### Item/entity card (glass-card)

```tsx
<motion.div variants={itemVariants} className="glass-card rounded-xl p-3.5 cursor-pointer" onClick={onClick}>
  <div className="flex items-start gap-3">
    <div className="p-1.5 rounded-lg bg-primary/10 text-primary mt-0.5 flex-shrink-0">
      <ItemIcon className="w-3.5 h-3.5" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-foreground text-xs leading-tight">Item Name</h3>
        <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 flex-shrink-0">
          Badge
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">Subtitle or metadata</p>
    </div>
  </div>
</motion.div>
```

### Filter tab bar

```tsx
<div className="flex flex-wrap items-center gap-2 mb-4">
  {filterOptions.map(tab => (
    <button key={tab.key} onClick={() => setFilter(tab.key)}
      className={cn(
        "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
        filter === tab.key
          ? "bg-primary text-white"
          : "bg-black/[0.04] text-muted-foreground hover:text-foreground"
      )}
    >
      {tab.label}
    </button>
  ))}
</div>
```

### Status/severity badges

Pattern: `bg-{semantic}/10 text-{semantic} border-{semantic}/20`

```tsx
// Success / connected
<span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
  <CheckCircle2 className="w-2.5 h-2.5" /> Connected
</span>

// Warning
<span className="bg-warning/10 text-warning border border-warning/20 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">
  Warning
</span>

// Primary role/type
<span className="bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold px-2.5 py-1 rounded-full">
  Admin
</span>

// Severity mapping:
// critical → text-destructive, bg-destructive/10
// warning  → text-warning, bg-warning/10
// positive → text-success, bg-success/10
// info     → text-primary, bg-primary/10
```

### Count badge (inline with section title)

```tsx
<span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
  {count}
</span>
```

### Primary action button (CTA)

```tsx
<button
  onClick={handleAction}
  disabled={isDisabled}
  className="p-3 rounded-xl bg-gradient-to-br from-primary to-[#A65A2C] text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
>
  <Icon className="w-4 h-4" />
</button>

// Full-width CTA (form submit):
<button
  onClick={onExecute}
  disabled={isRunning || isDisabled}
  className={cn(
    "w-full py-2.5 rounded-lg font-semibold text-sm transition-all",
    isRunning
      ? "bg-primary/20 text-primary/60 cursor-wait"
      : isDisabled
        ? "bg-muted text-muted-foreground cursor-not-allowed"
        : "bg-gradient-to-r from-primary to-[#A65A2C] text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
  )}
>
  {isRunning ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Processing...</span> : label}
</button>
```

### Text input (glass-input style)

```tsx
<input
  className="w-full glass-input rounded-[18px] pl-5 pr-28 py-4 text-sm focus:outline-none placeholder:text-muted-foreground/40"
  placeholder="Placeholder text..."
/>

// Compact form input:
<input
  className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
/>

// Select:
<select className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors">
```

### Form field wrapper

```tsx
<div className="space-y-1.5">
  <label className="text-xs font-medium text-foreground/70">
    Label{required && <span className="text-destructive ml-0.5">*</span>}
  </label>
  {/* input/select/etc */}
</div>
```

### Collapsible section (sidebar panels)

```tsx
function CollapsibleSection({ title, icon: Icon, iconColor, count, children }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity"
      >
        <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        <h4 className="text-xs font-semibold text-foreground flex-1 text-left">{title}</h4>
        <span className="text-[10px] font-normal text-muted-foreground">{count}</span>
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground/40 transition-transform", expanded ? "rotate-0" : "-rotate-90")} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Dropdown / role picker

```tsx
<div className="relative">
  <button onClick={() => setOpen(o => !o)}
    className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all", color, bg, border)}
  >
    <Icon className="w-3 h-3" />{label}
    <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
  </button>
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0, y: -4, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.97 }}
        transition={{ duration: 0.1 }}
        className="absolute right-0 top-full mt-1 z-20 glass-card rounded-xl overflow-hidden shadow-lg min-w-[120px]"
      >
        {options.map(opt => (
          <button key={opt} onClick={() => { select(opt); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/[0.04] transition-colors"
          >
            {opt}
          </button>
        ))}
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

### Chat console layout

Two-pane: main chat area (flex-1) + right context sidebar (w-72, `hidden lg:block`).

```tsx
<div className="flex h-[calc(100vh-3rem)]">
  {/* Main pane */}
  <div className="flex-1 flex flex-col relative overflow-hidden">
    {/* Sticky header */}
    <div className="h-14 px-4 md:px-6 glass flex items-center justify-between sticky top-0 z-10">
      {/* agent name + status indicator */}
    </div>
    {/* Messages scroll area */}
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-4">
      {/* messages */}
    </div>
    {/* Input bar */}
    <div className="px-4 md:px-6 py-3.5 glass">
      <form className="flex items-center gap-3 max-w-5xl mx-auto">
        <input className="flex-1 glass-input rounded-xl px-4 py-3 text-sm focus:outline-none placeholder:text-muted-foreground/40" />
        {/* send/stop button */}
      </form>
    </div>
  </div>
  {/* Right sidebar */}
  <div className="w-72 flex-shrink-0 glass-card border-l border-black/[0.04] overflow-y-auto p-4 space-y-5 hidden lg:block">
    {/* context sections */}
  </div>
</div>
```

**User message bubble:**
```tsx
<div className="rounded-xl px-4 py-3 bg-gradient-to-br from-primary to-[#A65A2C] text-white shadow-[0_4px_16px_hsla(24,58%,25%,0.15)]">
  <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
</div>
```

**Agent message bubble:**
```tsx
<div className="rounded-xl px-5 py-4 glass-card">
  <div className="prose-agent">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </div>
</div>
```

**Agent avatar:**
```tsx
<div className="w-7 h-7 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center border border-primary/20 mt-1">
  <Bot className="w-3.5 h-3.5 text-primary" />
</div>
```

**Online status indicator:**
```tsx
<span className="w-1.5 h-1.5 rounded-full bg-success inline-block animate-pulse" />
```

### Split-pane journey layout

Left panel (form) + right panel (output). Read `src/components/journey-layout.tsx` for exact implementation.

Left panel: `w-[340px] md:w-[380px] flex-shrink-0 border-r border-border/50 flex flex-col bg-card/30`

Header of left panel:
```tsx
<div className="px-5 py-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-primary/5">
  <div className="flex items-center gap-3 mb-1">
    <div className="p-1.5 rounded-lg bg-primary/15 flex-shrink-0">
      <TitleIcon className="w-4 h-4 text-primary" />
    </div>
    <h1 className="text-base font-bold text-foreground flex-1">{title}</h1>
  </div>
  <p className="text-xs text-muted-foreground ml-[38px]">{subtitle}</p>
</div>
```

Empty state (right panel):
```tsx
<div className="flex-1 flex items-center justify-center">
  <div className="text-center space-y-3 max-w-sm px-4">
    <div className="w-16 h-16 rounded-2xl bg-primary/[0.08] flex items-center justify-center mx-auto">
      <TitleIcon className="w-8 h-8 text-primary/40" />
    </div>
    <p className="text-sm text-muted-foreground">Fill in the parameters and click <strong>Execute</strong> to start.</p>
  </div>
</div>
```

### Pipeline / activity feed

Timeline with connector line:
```tsx
<div className="flex items-start gap-2.5 relative">
  {!isLast && <div className="absolute left-[7px] top-[20px] bottom-0 w-px bg-black/[0.06]" />}
  <div className={cn("flex-shrink-0 mt-1 relative z-10 rounded-full p-0.5", CATEGORY_BG[category])}>
    <StepIcon />
  </div>
  <div className="flex-1 min-w-0 pb-2.5">
    <span className={cn("text-xs leading-tight", isActive ? "text-foreground font-medium" : "text-muted-foreground")}>
      {label}
    </span>
  </div>
</div>
```

Phase divider:
```tsx
<div className="flex items-center gap-2 py-2">
  <div className="h-px flex-1 bg-primary/10" />
  <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60 px-2">Phase {n}: {name}</span>
  <div className="h-px flex-1 bg-primary/10" />
</div>
```

### Framer Motion animation constants

```tsx
// Item enter animation (spring)
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

// Container stagger
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// Collapse animation
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: "auto", opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  transition={{ duration: 0.15 }}
  className="overflow-hidden"
>

// Dropdown animation
initial={{ opacity: 0, y: -4, scale: 0.97 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
exit={{ opacity: 0, y: -4, scale: 0.97 }}
transition={{ duration: 0.1 }}

// Quick action card hover
className="... hover:scale-[1.02] transition-all"
```

### Loading states

```tsx
// Spinner centered
<div className="flex items-center justify-center h-full">
  <Loader2 className="w-6 h-6 animate-spin text-primary" />
</div>

// Inline with text
<span className="flex items-center justify-center gap-2">
  <Loader2 className="w-4 h-4 animate-spin" />Processing...
</span>

// Suspense fallback
<div className="flex h-screen items-center justify-center text-muted-foreground text-sm">Loading...</div>
```

### Modal / overlay

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
  onClick={onClose}
>
  <div
    className="glass-card rounded-2xl shadow-2xl w-[calc(100vw-2rem)] sm:w-[560px] max-h-[65vh] flex flex-col overflow-hidden"
    onClick={e => e.stopPropagation()}
  >
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06]">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Modal Title</span>
      </div>
      <button onClick={onClose} className="p-1.5 hover:bg-black/[0.04] rounded-lg text-muted-foreground transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
    <div className="flex-1 overflow-y-auto p-5">{/* content */}</div>
  </div>
</motion.div>
```

### Integration/app card grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {items.map(item => (
    <motion.div key={item.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("group relative rounded-xl p-5 transition-all duration-200 glass-card",
        item.isActive && "ring-1 ring-success/20"
      )}
    >
      {/* logo + name + status badge + description + metadata row */}
    </motion.div>
  ))}
</div>
```

### Prose / markdown output

```tsx
// Apply .prose-agent class (defined in globals.css) for agent/AI text output
<div className="prose-agent">
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownContent}</ReactMarkdown>
</div>

// For journey output panels:
<div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground">
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
</div>
```

### Info/context banner

```tsx
<div className="phase-context-banner rounded-xl p-5 mb-6">
  <div className="flex items-start gap-3">
    <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-1">Banner Title</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">Description with <code className="text-[10px] font-mono bg-black/[0.04] px-1 rounded">inline code</code> support.</p>
    </div>
  </div>
</div>
```

### Error state

```tsx
<div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
  <div className="flex items-center gap-2">
    <AlertTriangle className="w-4 h-4 text-destructive" />
    <span className="text-sm text-destructive">{errorMessage}</span>
  </div>
</div>
```

---

## Icons convention

- **Navigation icons**: `@tabler/icons-react` — `IconDashboard`, `IconTerminal2`, `IconPlugConnected`, `IconSettings`, `IconBook`, `IconSitemap`, `IconFolderOpen`, `IconClipboardList`, `IconFileSearch`, `IconChartBar`, `IconFileReport`
- **All other icons**: `lucide-react`
- Icon sizes: `w-3 h-3` (micro), `w-3.5 h-3.5` (small default), `w-4 h-4` (medium), `w-5 h-5` (section), `w-6 h-6` (page header)
- Icon containers: `p-1.5 rounded-lg bg-primary/10 text-primary` (small) or `p-2 rounded-xl bg-primary/10` (larger)

---

## Text size scale

| Use | Class |
|-----|-------|
| Page title | `text-2xl font-bold tracking-tight` |
| Section heading | `text-sm font-semibold` |
| Card title | `text-xs font-semibold` or `text-base font-bold` |
| Body / description | `text-sm text-muted-foreground` |
| Secondary meta | `text-xs text-muted-foreground` |
| Micro meta | `text-[11px]` / `text-[10px]` / `text-[9px]` |
| Status badge | `text-[9px] uppercase tracking-wider font-bold` |
| Group label | `text-[10px] font-semibold text-muted-foreground uppercase tracking-wider` |
| Large metric value | `text-2xl font-bold` or `text-lg font-bold font-mono tabular-nums` |
| Count bubble | `text-[9px] font-medium` |

---

## Migration checklist

When migrating an existing frontend, complete these steps in order:

1. **Install dependencies** — add all packages from the package list above
2. **Replace `globals.css`** — copy the design tokens, utility classes, and font imports from the reference
3. **Update `layout.tsx`** — add three Google fonts with CSS variables, wrap in `SidebarLayout`
4. **Copy sidebar components** — `SidebarLayout`, `AppSidebar`, `NavMain`, `NavJourneys`, `NavSecondary`, `NavUser` from reference; update nav items to match the target app's routes
5. **Copy `site-header.tsx`** — unchanged (just sidebar trigger + right slot)
6. **Copy `Logo.tsx`** — reuse or swap with app-specific logo SVG
7. **Update page layouts** — each page gets `p-4 md:p-8 max-w-{n}xl mx-auto` wrapper + page header pattern
8. **Replace cards** — add `glass-card rounded-xl` to every card-like container
9. **Replace buttons** — primary CTAs get gradient, secondary get `bg-black/[0.04]`, filter tabs get the pill pattern
10. **Replace inputs** — apply `glass-input` class or the compact form input classes
11. **Replace badges** — use semantic color pattern `bg-{color}/10 text-{color} border-{color}/20`
12. **Add Framer Motion** — wrap list items in `motion.div` with `itemVariants`, wrap lists in `containerVariants`
13. **Add collapse animations** — any expandable section uses the `height: 0 → auto` pattern with `AnimatePresence`
14. **Verify typography** — confirm headings render in Playfair Display, body in Inter, data/code in JetBrains Mono

---

## New UI scaffolding

When building a new UI from scratch:

1. Run `npx create-next-app@latest --typescript --tailwind --app`
2. Install all packages from the package list
3. Initialize shadcn: `npx shadcn@latest init` — choose "Default" style, copy color config from design tokens
4. Copy exact files from reference:
   - `src/app/globals.css` → verbatim
   - `src/app/layout.tsx` → adapt for new app name/metadata
   - `src/components/sidebar/SidebarLayout.tsx` → verbatim
   - `src/components/ui/app-sidebar.tsx` → adapt nav items for new routes
   - `src/components/ui/site-header.tsx` → verbatim
   - `src/components/logo/Logo.tsx` → swap SVG or reuse
5. Build each page using the patterns documented above
6. Use `motion.div` with `itemVariants` for all list/card renders
7. Use `glass-card rounded-xl` for all card containers
8. Use `glass-input` or compact input pattern for all form fields
9. Use `bg-gradient-to-br from-primary to-[#A65A2C]` for all primary CTAs

---

## What NOT to do

- Do not use blue or other non-warm colors as primary — only use warm browns (`primary`/`accent`)
- Do not use sharp corners — minimum `rounded-lg` (0.75rem), prefer `rounded-xl` (1rem)
- Do not write inline styles for colors — use CSS variables only
- Do not use heavy drop shadows — use the subtle `glass-card` shadow pattern
- Do not skip Framer Motion for list items — animated entrance is part of the visual language
- Do not use default browser inputs — always apply `glass-input` or the form input class
- Do not put headings in Inter — Playfair Display is applied globally to h1-h6 via CSS
- Do not use `text-black` or `text-white` directly — use `text-foreground` and `text-primary-foreground`
- Do not hardcode hex colors — use the semantic token names (`text-primary`, `bg-success/10`, etc.)
