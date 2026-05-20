import { useState, useEffect, useCallback, useRef } from "react";
import { useClerk, useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyCard,
  useCreateCard,
  useUpdateCard,
  usePublishCard,
  useUnpublishCard,
  useGetCardQr,
  useExportCard,
  useCheckUsername,
  getGetMyCardQueryKey,
  getGetCardQrQueryKey,
  getCheckUsernameQueryKey,
  getExportCardQueryKey,
} from "@workspace/api-client-react";
import { CardDisplay } from "./PublicCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  Plus,
  Trash2,
  Globe,
  QrCode,
  Download,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  GripVertical,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LINK_TYPES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone Call" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "youtube", label: "YouTube" },
  { value: "github", label: "GitHub" },
  { value: "custom", label: "Custom URL" },
];

const FONT_OPTIONS = [
  { value: "outfit", label: "Outfit — Modern" },
  { value: "playfair", label: "Playfair Display — Luxury" },
  { value: "inter", label: "Inter — Corporate" },
];

const ICON_PACK_OPTIONS = [
  { value: "tech", label: "Tech / Sourcing" },
  { value: "real-estate", label: "Real Estate" },
  { value: "creative", label: "Creative / Design" },
  { value: "medical", label: "Medical / Health" },
];

interface CardLink {
  type: string;
  label?: string | null;
  url: string;
  icon?: string | null;
  sortOrder?: number;
}

interface CardData {
  brandName: string;
  brandSubtitle: string;
  fullName: string;
  professionalTitle: string;
  location: string;
  showStatusDot: boolean;
  bio: string;
  profileImageUrl: string;
  accentColor: string;
  textColor: string;
  bgColor: string;
  fontStyle: string;
  bgIconPack: string;
  bgIconDensity: number;
  bgIconOpacity: number;
  links: CardLink[];
}

const DEFAULT_CARD: CardData = {
  brandName: "",
  brandSubtitle: "",
  fullName: "",
  professionalTitle: "",
  location: "",
  showStatusDot: false,
  bio: "",
  profileImageUrl: "",
  accentColor: "#e63946",
  textColor: "#1a1a2e",
  bgColor: "#f8f9fa",
  fontStyle: "outfit",
  bgIconPack: "tech",
  bgIconDensity: 1.0,
  bgIconOpacity: 0.08,
  links: [],
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function Editor() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [cardData, setCardData] = useState<CardData>(DEFAULT_CARD);
  const [cardId, setCardId] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [publishUsername, setPublishUsername] = useState("");
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedUsername, setPublishedUsername] = useState<string | null>(null);
  const debouncedCard = useDebounce(cardData, 800);
  const pendingSave = useRef(false);

  const { data: existingCard, isLoading: cardLoading } = useGetMyCard({
    query: { queryKey: getGetMyCardQueryKey() },
  });

  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const publishCard = usePublishCard();
  const unpublishCard = useUnpublishCard();

  const usernameCheck = useCheckUsername(
    { username: publishUsername },
    {
      query: {
        queryKey: getCheckUsernameQueryKey({ username: publishUsername }),
        enabled: publishUsername.length >= 3 && publishUsername !== publishedUsername,
      },
    }
  );

  const qrQuery = useGetCardQr(cardId!, {
    query: {
      queryKey: getGetCardQrQueryKey(cardId!),
      enabled: !!cardId && isPublished,
    },
  });

  const exportQuery = useExportCard(cardId!, {
    query: {
      queryKey: getExportCardQueryKey(cardId!),
      enabled: false,
    },
  });

  // Initialize from existing card
  useEffect(() => {
    if (existingCard && !initialized) {
      setCardId(existingCard.id);
      setIsPublished(existingCard.isPublished);
      setPublishedUsername(existingCard.username ?? null);
      if (existingCard.username) setPublishUsername(existingCard.username);
      setCardData({
        brandName: existingCard.brandName ?? "",
        brandSubtitle: existingCard.brandSubtitle ?? "",
        fullName: existingCard.fullName ?? "",
        professionalTitle: existingCard.professionalTitle ?? "",
        location: existingCard.location ?? "",
        showStatusDot: existingCard.showStatusDot ?? false,
        bio: existingCard.bio ?? "",
        profileImageUrl: existingCard.profileImageUrl ?? "",
        accentColor: existingCard.accentColor ?? "#e63946",
        textColor: existingCard.textColor ?? "#1a1a2e",
        bgColor: existingCard.bgColor ?? "#f8f9fa",
        fontStyle: existingCard.fontStyle ?? "outfit",
        bgIconPack: existingCard.bgIconPack ?? "tech",
        bgIconDensity: existingCard.bgIconDensity ?? 1.0,
        bgIconOpacity: existingCard.bgIconOpacity ?? 0.08,
        links: (existingCard.links as CardLink[]) ?? [],
      });
      setInitialized(true);
    } else if (!existingCard && !cardLoading && !initialized) {
      // Pre-fill name from Clerk user
      if (user?.fullName) {
        setCardData((d) => ({ ...d, fullName: user.fullName || "" }));
      }
      setInitialized(true);
    }
  }, [existingCard, cardLoading, initialized, user]);

  // Auto-save
  useEffect(() => {
    if (!initialized || !debouncedCard.fullName.trim()) return;
    if (pendingSave.current) return;

    pendingSave.current = true;
    setIsSaving(true);

    const save = async () => {
      try {
        const payload = {
          ...debouncedCard,
          brandName: debouncedCard.brandName || null,
          brandSubtitle: debouncedCard.brandSubtitle || null,
          professionalTitle: debouncedCard.professionalTitle || null,
          location: debouncedCard.location || null,
          bio: debouncedCard.bio || null,
          profileImageUrl: debouncedCard.profileImageUrl || null,
          links: debouncedCard.links.map((l, i) => ({ ...l, sortOrder: i })),
        };

        if (!cardId) {
          const newCard = await createCard.mutateAsync({ data: payload });
          setCardId(newCard.id);
          queryClient.invalidateQueries({ queryKey: getGetMyCardQueryKey() });
        } else {
          await updateCard.mutateAsync({ id: cardId, data: payload });
          queryClient.invalidateQueries({ queryKey: getGetMyCardQueryKey() });
        }
      } catch {
        toast({ title: "Save failed", description: "Could not save your card.", variant: "destructive" });
      } finally {
        setIsSaving(false);
        pendingSave.current = false;
      }
    };

    save();
  }, [debouncedCard]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(<K extends keyof CardData>(key: K, value: CardData[K]) => {
    setCardData((d) => ({ ...d, [key]: value }));
  }, []);

  const addLink = () => {
    setCardData((d) => ({
      ...d,
      links: [...d.links, { type: "email", url: "", label: "", sortOrder: d.links.length }],
    }));
  };

  const removeLink = (i: number) => {
    setCardData((d) => ({ ...d, links: d.links.filter((_, idx) => idx !== i) }));
  };

  const updateLink = (i: number, field: keyof CardLink, value: string) => {
    setCardData((d) => ({
      ...d,
      links: d.links.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)),
    }));
  };

  const handlePublish = async () => {
    if (!cardId || !publishUsername) return;
    try {
      const result = await publishCard.mutateAsync({ id: cardId, data: { username: publishUsername } });
      setIsPublished(true);
      setPublishedUsername(result.username ?? null);
      queryClient.invalidateQueries({ queryKey: getGetMyCardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCardQrQueryKey(cardId) });
      toast({ title: "Card published!", description: `Live at /${publishUsername}` });
      setShowPublishPanel(false);
    } catch (e: any) {
      const msg = e?.data?.error || "Could not publish your card.";
      toast({ title: "Publish failed", description: msg, variant: "destructive" });
    }
  };

  const handleUnpublish = async () => {
    if (!cardId) return;
    try {
      await unpublishCard.mutateAsync({ id: cardId });
      setIsPublished(false);
      queryClient.invalidateQueries({ queryKey: getGetMyCardQueryKey() });
      toast({ title: "Card unpublished" });
    } catch {
      toast({ title: "Error", description: "Could not unpublish.", variant: "destructive" });
    }
  };

  const handleExport = async () => {
    if (!cardId) return;
    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        const blob = new Blob([result.data.html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleDownloadQr = () => {
    if (!qrQuery.data?.svg) return;
    const blob = new Blob([qrQuery.data.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${publishedUsername}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const domains = (import.meta.env.VITE_REPLIT_DOMAINS || window.location.host).split(",");
  const domain = domains[0] || window.location.host;
  const publicUrl = `https://${domain}/c/${publishedUsername}`;

  const usernameAvailable =
    publishUsername.length >= 3 &&
    publishUsername !== publishedUsername &&
    usernameCheck.data?.available === true;
  const usernameUnavailable =
    publishUsername.length >= 3 &&
    publishUsername !== publishedUsername &&
    usernameCheck.data?.available === false;

  if (cardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b px-6 py-3 flex items-center justify-between bg-card sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-tight text-lg">Identity.</span>
          {isSaving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Saving…
            </span>
          )}
          {!isSaving && cardId && (
            <span className="text-xs text-muted-foreground">Saved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPublished && publishedUsername && (
            <a
              href={`/c/${publishedUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-view-card"
              className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink size={12} />
              View live card
            </a>
          )}
          {isPublished ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPublishPanel(true)}
              data-testid="button-publish-settings"
            >
              <Globe size={14} className="mr-1.5" />
              Published
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setShowPublishPanel(true)}
              disabled={!cardId}
              data-testid="button-publish"
            >
              <Globe size={14} className="mr-1.5" />
              Publish
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            data-testid="button-signout"
          >
            <LogOut size={14} />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Editor */}
        <div className="w-full max-w-lg border-r overflow-y-auto">
          <div className="p-6">
            <Tabs defaultValue="content">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="content" className="flex-1" data-testid="tab-content">Content</TabsTrigger>
                <TabsTrigger value="links" className="flex-1" data-testid="tab-links">Links</TabsTrigger>
                <TabsTrigger value="design" className="flex-1" data-testid="tab-design">Design</TabsTrigger>
              </TabsList>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-5">
                <div className="space-y-4 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="brandName">Brand Name</Label>
                      <Input
                        id="brandName"
                        data-testid="input-brandname"
                        placeholder="acme inc."
                        value={cardData.brandName}
                        onChange={(e) => update("brandName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="brandSubtitle">Slogan</Label>
                      <Input
                        id="brandSubtitle"
                        data-testid="input-brandsubtitle"
                        placeholder="Building the future"
                        value={cardData.brandSubtitle}
                        onChange={(e) => update("brandSubtitle", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal</h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      data-testid="input-fullname"
                      placeholder="Alex Morgan"
                      value={cardData.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="title">Professional Title</Label>
                    <Input
                      id="title"
                      data-testid="input-title"
                      placeholder="Product Designer"
                      value={cardData.professionalTitle}
                      onChange={(e) => update("professionalTitle", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="location">Location</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="location"
                        data-testid="input-location"
                        placeholder="San Francisco, CA"
                        value={cardData.location}
                        onChange={(e) => update("location", e.target.value)}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          id="statusDot"
                          data-testid="switch-statusdot"
                          checked={cardData.showStatusDot}
                          onCheckedChange={(v) => update("showStatusDot", v)}
                        />
                        <Label htmlFor="statusDot" className="text-xs text-muted-foreground whitespace-nowrap">Live dot</Label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label htmlFor="bio">Bio / Tagline</Label>
                      <span className={`text-xs ${cardData.bio.length > 140 ? "text-destructive" : "text-muted-foreground"}`}>
                        {cardData.bio.length}/150
                      </span>
                    </div>
                    <Textarea
                      id="bio"
                      data-testid="input-bio"
                      placeholder="A short, memorable line about you or your work."
                      value={cardData.bio}
                      maxLength={150}
                      rows={3}
                      onChange={(e) => update("bio", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profileImage">Profile Image URL</Label>
                    <Input
                      id="profileImage"
                      data-testid="input-profileimage"
                      placeholder="https://..."
                      value={cardData.profileImageUrl}
                      onChange={(e) => update("profileImageUrl", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Paste a direct image URL. Leave blank to use initials.</p>
                  </div>
                </div>
              </TabsContent>

              {/* Links Tab */}
              <TabsContent value="links" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{cardData.links.length} link{cardData.links.length !== 1 ? "s" : ""}</p>
                  <Button size="sm" variant="outline" onClick={addLink} data-testid="button-addlink">
                    <Plus size={14} className="mr-1.5" />
                    Add Link
                  </Button>
                </div>

                {cardData.links.length === 0 && (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <p className="text-muted-foreground text-sm">No links yet. Add a way for people to contact you.</p>
                  </div>
                )}

                <div className="space-y-3">
                  {cardData.links.map((link, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-3" data-testid={`link-item-${i}`}>
                      <div className="flex items-center gap-2">
                        <GripVertical size={16} className="text-muted-foreground shrink-0" />
                        <select
                          value={link.type}
                          onChange={(e) => updateLink(i, "type", e.target.value)}
                          data-testid={`select-linktype-${i}`}
                          className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {LINK_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLink(i)}
                          data-testid={`button-removelink-${i}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <Input
                        placeholder="URL (https://...)"
                        value={link.url}
                        onChange={(e) => updateLink(i, "url", e.target.value)}
                        data-testid={`input-linkurl-${i}`}
                      />
                      <Input
                        placeholder="Label (optional)"
                        value={link.label || ""}
                        onChange={(e) => updateLink(i, "label", e.target.value)}
                        data-testid={`input-linklabel-${i}`}
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Design Tab */}
              <TabsContent value="design" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colors</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>Accent</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={cardData.accentColor}
                          onChange={(e) => update("accentColor", e.target.value)}
                          data-testid="color-accent"
                          className="h-9 w-9 rounded cursor-pointer border border-input"
                        />
                        <span className="text-xs text-muted-foreground font-mono">{cardData.accentColor}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Text</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={cardData.textColor}
                          onChange={(e) => update("textColor", e.target.value)}
                          data-testid="color-text"
                          className="h-9 w-9 rounded cursor-pointer border border-input"
                        />
                        <span className="text-xs text-muted-foreground font-mono">{cardData.textColor}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Background</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={cardData.bgColor}
                          onChange={(e) => update("bgColor", e.target.value)}
                          data-testid="color-bg"
                          className="h-9 w-9 rounded cursor-pointer border border-input"
                        />
                        <span className="text-xs text-muted-foreground font-mono">{cardData.bgColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Typography</h3>
                  <div className="space-y-1.5">
                    <Label>Font Style</Label>
                    <select
                      value={cardData.fontStyle}
                      onChange={(e) => update("fontStyle", e.target.value)}
                      data-testid="select-font"
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Background Icons</h3>
                  <div className="space-y-1.5">
                    <Label>Icon Pack</Label>
                    <select
                      value={cardData.bgIconPack}
                      onChange={(e) => update("bgIconPack", e.target.value)}
                      data-testid="select-iconpack"
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {ICON_PACK_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Density</Label>
                      <span className="text-xs text-muted-foreground">{cardData.bgIconDensity.toFixed(1)}×</span>
                    </div>
                    <Slider
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      value={[cardData.bgIconDensity]}
                      onValueChange={([v]) => update("bgIconDensity", v)}
                      data-testid="slider-density"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Opacity</Label>
                      <span className="text-xs text-muted-foreground">{Math.round(cardData.bgIconOpacity * 100)}%</span>
                    </div>
                    <Slider
                      min={0.02}
                      max={0.2}
                      step={0.01}
                      value={[cardData.bgIconOpacity]}
                      onValueChange={([v]) => update("bgIconOpacity", v)}
                      data-testid="slider-opacity"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 p-8 overflow-y-auto">
          <div className="mb-4 text-xs text-muted-foreground tracking-wide uppercase">Live Preview</div>
          <div
            className="w-full max-w-[380px] rounded-2xl overflow-hidden shadow-xl border relative"
            style={{ minHeight: 520 }}
            data-testid="card-preview-wrapper"
          >
            <CardDisplay
              card={cardData}
              preview
            />
          </div>

          {/* Published actions */}
          {isPublished && publishedUsername && (
            <div className="mt-6 w-full max-w-[380px] space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle size={14} className="text-green-500" />
                <a
                  href={`/c/${publishedUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 text-xs font-mono truncate"
                  data-testid="link-public-url"
                >
                  {publicUrl}
                </a>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleExport}
                  data-testid="button-export"
                  disabled={exportQuery.isFetching}
                >
                  {exportQuery.isFetching ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Download size={14} className="mr-1.5" />}
                  Export HTML
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowPublishPanel(true)}
                  data-testid="button-qr-settings"
                >
                  <QrCode size={14} className="mr-1.5" />
                  QR Code
                </Button>
              </div>

              {qrQuery.data?.svg && (
                <div className="border rounded-lg p-4 flex flex-col items-center gap-3">
                  <div
                    dangerouslySetInnerHTML={{ __html: qrQuery.data.svg }}
                    className="w-32 h-32"
                    data-testid="qr-svg"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadQr}
                    data-testid="button-download-qr"
                  >
                    <Download size={12} className="mr-1.5" />
                    Download QR
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Publish Panel (modal overlay) */}
      {showPublishPanel && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowPublishPanel(false)}
        >
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-semibold mb-1">
              {isPublished ? "Publish Settings" : "Publish Your Card"}
            </h2>
            <p className="text-muted-foreground text-sm mb-5">
              {isPublished
                ? "Your card is live. Update settings or unpublish below."
                : "Choose a username for your public card URL."}
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="publishUsername">Username</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="publishUsername"
                      data-testid="input-username"
                      placeholder="yourname"
                      value={publishUsername}
                      onChange={(e) => setPublishUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                      className="pr-8"
                    />
                    {publishUsername.length >= 3 && publishUsername !== publishedUsername && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2">
                        {usernameCheck.isLoading ? (
                          <Loader2 size={14} className="animate-spin text-muted-foreground" />
                        ) : usernameAvailable ? (
                          <CheckCircle size={14} className="text-green-500" />
                        ) : usernameUnavailable ? (
                          <AlertCircle size={14} className="text-destructive" />
                        ) : null}
                      </span>
                    )}
                  </div>
                </div>
                {publishUsername.length >= 3 && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {window.location.origin}/c/{publishUsername}
                  </p>
                )}
                {usernameUnavailable && (
                  <p className="text-xs text-destructive">That username is taken. Try another.</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handlePublish}
                  disabled={
                    publishCard.isPending ||
                    !publishUsername ||
                    publishUsername.length < 3 ||
                    (usernameUnavailable && publishUsername !== publishedUsername)
                  }
                  data-testid="button-confirm-publish"
                >
                  {publishCard.isPending ? (
                    <Loader2 size={14} className="animate-spin mr-1.5" />
                  ) : (
                    <Globe size={14} className="mr-1.5" />
                  )}
                  {isPublished ? "Update & Re-publish" : "Publish Now"}
                </Button>

                {isPublished && (
                  <Button
                    variant="outline"
                    onClick={handleUnpublish}
                    disabled={unpublishCard.isPending}
                    data-testid="button-unpublish"
                    className="text-muted-foreground"
                  >
                    {unpublishCard.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <EyeOff size={14} />
                    )}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={() => setShowPublishPanel(false)}
                  data-testid="button-close-publish"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
