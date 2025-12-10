import { useState, useCallback, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  Copy, 
  Check, 
  Loader2, 
  Trash2, 
  Code2, 
  Lock, 
  Download,
  FileCode,
  Settings,
  BookOpen
} from "lucide-react";
import { SiGithub } from "react-icons/si";

const SAMPLE_CODE = `-- Prometheus Obfuscator Sample
-- Enter your Lua code here to obfuscate it

local function greet(name)
    print("Hello, " .. name .. "!")
    return true
end

local function calculateSum(a, b)
    local result = a + b
    return result
end

-- Main execution
local userName = "World"
greet(userName)

local sum = calculateSum(10, 25)
print("Sum: " .. sum)
`;

type PresetLevel = "Weak" | "Medium" | "Strong" | "Maximum";

const PRESET_INFO: Record<PresetLevel, { label: string; description: string }> = {
  Weak: { label: "Weak", description: "Light obfuscation, smallest output size" },
  Medium: { label: "Medium", description: "Balanced protection and performance" },
  Strong: { label: "Strong", description: "High security with advanced protection" },
  Maximum: { label: "Maximum", description: "Maximum security with VM-based execution" },
};

export default function Home() {
  const [inputCode, setInputCode] = useState("");
  const [outputCode, setOutputCode] = useState("");
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [preset, setPreset] = useState<PresetLevel>("Maximum");
  const [mobileTab, setMobileTab] = useState<"input" | "output">("input");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toast } = useToast();

  const obfuscateMutation = useMutation({
    mutationFn: async (data: { code: string; preset: PresetLevel }) => {
      const response = await apiRequest("POST", "/api/obfuscate", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setOutputCode(data.obfuscatedCode);
        setMobileTab("output");
        toast({
          title: "Obfuscation Complete",
          description: `Your code has been successfully obfuscated with the ${preset} preset.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Obfuscation Failed",
          description: data.error || "An unknown error occurred.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to connect to the server.",
      });
    },
  });

  const handleObfuscate = useCallback(() => {
    if (!inputCode.trim()) {
      toast({
        variant: "destructive",
        title: "No Code Entered",
        description: "Please enter some Lua code to obfuscate.",
      });
      return;
    }
    obfuscateMutation.mutate({ code: inputCode, preset });
  }, [inputCode, preset, obfuscateMutation, toast]);

  const copyToClipboard = useCallback(async (text: string, isInput: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isInput) {
        setCopiedInput(true);
        setTimeout(() => setCopiedInput(false), 2000);
      } else {
        setCopiedOutput(true);
        setTimeout(() => setCopiedOutput(false), 2000);
      }
      toast({
        title: "Copied!",
        description: "Code copied to clipboard.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
      });
    }
  }, [toast]);

  const downloadCode = useCallback(() => {
    if (!outputCode) return;
    const blob = new Blob([outputCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "obfuscated.lua";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded",
      description: "Obfuscated code saved as obfuscated.lua",
    });
  }, [outputCode, toast]);

  const loadSample = useCallback(() => {
    setInputCode(SAMPLE_CODE);
    setMobileTab("input");
    toast({
      title: "Sample Loaded",
      description: "Sample Lua code has been loaded into the editor.",
    });
  }, [toast]);

  const clearInput = useCallback(() => {
    setInputCode("");
    setOutputCode("");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleObfuscate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleObfuscate]);

  const inputLineCount = inputCode.split("\n").length;
  const inputCharCount = inputCode.length;
  const outputLineCount = outputCode.split("\n").length;
  const outputCharCount = outputCode.length;

  const InputPanel = ({ className = "" }: { className?: string }) => (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium" data-testid="text-input-label">Input Code</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSample}
            data-testid="button-load-sample"
          >
            <FileCode className="w-4 h-4" />
            <span className="hidden sm:inline">Sample</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(inputCode, true)}
            disabled={!inputCode}
            data-testid="button-copy-input"
          >
            {copiedInput ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">Copy</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearInput}
            disabled={!inputCode}
            data-testid="button-clear-input"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {!inputCode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <Code2 className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm" data-testid="text-input-empty">Paste your Lua code here</p>
            <p className="text-muted-foreground/60 text-xs mt-1">or click "Sample" to load example code</p>
          </div>
        )}
        <Editor
          height="100%"
          defaultLanguage="lua"
          value={inputCode}
          onChange={(value) => setInputCode(value || "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12 },
            tabSize: 2,
            wordWrap: "on",
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-1.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
        <span data-testid="text-input-lines">{inputLineCount} lines</span>
        <span data-testid="text-input-chars">{inputCharCount.toLocaleString()} characters</span>
      </div>
    </div>
  );

  const OutputPanel = ({ className = "" }: { className?: string }) => (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium" data-testid="text-output-label">Obfuscated Output</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(outputCode, false)}
            disabled={!outputCode}
            data-testid="button-copy-output"
          >
            {copiedOutput ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">Copy</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadCode}
            disabled={!outputCode}
            data-testid="button-download"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {!outputCode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <Lock className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm" data-testid="text-output-empty">Obfuscated code will appear here</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Click "Obfuscate Code" to process your code</p>
          </div>
        )}
        <Editor
          height="100%"
          defaultLanguage="lua"
          value={outputCode}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12 },
            tabSize: 2,
            wordWrap: "on",
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-1.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
        <span data-testid="text-output-lines">{outputCode ? outputLineCount : 0} lines</span>
        <span data-testid="text-output-chars">{outputCharCount.toLocaleString()} characters</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card sm:px-4 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-primary">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight" data-testid="text-app-title">Prometheus</h1>
            <p className="text-xs text-muted-foreground hidden sm:block" data-testid="text-app-subtitle">Lua Code Protection</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="link-github"
          >
            <a 
              href="https://github.com/levno-710/Prometheus" 
              target="_blank" 
              rel="noopener noreferrer"
              title="View on GitHub"
            >
              <SiGithub className="w-4 h-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="link-docs"
          >
            <a 
              href="https://levno-710.gitbook.io/prometheus" 
              target="_blank" 
              rel="noopener noreferrer"
              title="Documentation"
            >
              <BookOpen className="w-4 h-4" />
            </a>
          </Button>

          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-settings">
                <Settings className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Obfuscation Settings</SheetTitle>
                <SheetDescription>
                  Configure the obfuscation preset and options.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <Label>Obfuscation Preset</Label>
                  <RadioGroup 
                    value={preset} 
                    onValueChange={(value) => setPreset(value as PresetLevel)}
                    className="space-y-3"
                  >
                    {(Object.keys(PRESET_INFO) as PresetLevel[]).map((level) => (
                      <div key={level} className="flex items-start space-x-3">
                        <RadioGroupItem 
                          value={level} 
                          id={`preset-${level}`}
                          data-testid={`radio-preset-${level.toLowerCase()}`}
                        />
                        <Label htmlFor={`preset-${level}`} className="flex flex-col cursor-pointer">
                          <span className="font-medium">{PRESET_INFO[level].label}</span>
                          <span className="text-xs text-muted-foreground">{PRESET_INFO[level].description}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <p className="text-sm font-medium">Current Selection</p>
                  <div className="p-3 rounded-md bg-muted/50">
                    <p className="text-sm font-medium" data-testid="text-current-preset">{preset} Preset</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {PRESET_INFO[preset].description}
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={() => setSettingsOpen(false)} 
                  className="w-full"
                  data-testid="button-apply-settings"
                >
                  Apply Settings
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            onClick={handleObfuscate}
            disabled={obfuscateMutation.isPending || !inputCode.trim()}
            size="default"
            data-testid="button-obfuscate"
          >
            {obfuscateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline" data-testid="text-status-processing">Processing...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Obfuscate</span>
              </>
            )}
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="hidden md:block h-full">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={60} minSize={25}>
              <InputPanel />
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={40} minSize={25}>
              <OutputPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <div className="md:hidden h-full flex flex-col">
          <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as "input" | "output")} className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border h-10">
              <TabsTrigger value="input" data-testid="tab-input" className="gap-1.5">
                <Code2 className="w-4 h-4" />
                <span>Input</span>
              </TabsTrigger>
              <TabsTrigger value="output" data-testid="tab-output" className="gap-1.5">
                <Lock className="w-4 h-4" />
                <span>Output</span>
                {outputCode && (
                  <span className="w-2 h-2 rounded-full bg-chart-2" />
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="input" className="flex-1 m-0 data-[state=active]:flex data-[state=inactive]:hidden">
              <InputPanel className="flex-1" />
            </TabsContent>
            <TabsContent value="output" className="flex-1 m-0 data-[state=active]:flex data-[state=inactive]:hidden">
              <OutputPanel className="flex-1" />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="flex items-center justify-center gap-2 px-4 py-2 border-t border-border bg-card text-xs text-muted-foreground flex-wrap">
        <span data-testid="text-powered-by">Powered by Prometheus</span>
        <span className="text-muted-foreground/40">|</span>
        <span data-testid="text-footer-preset">{preset} Preset</span>
        <span className="text-muted-foreground/40 hidden sm:inline">|</span>
        <span className="hidden sm:inline">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl+Enter</kbd>
          <span className="ml-1">to obfuscate</span>
        </span>
      </footer>
    </div>
  );
}
