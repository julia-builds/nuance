import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MAX_NAME = 100;
const MAX_EMAIL = 255;
const MAX_MESSAGE = 1000;

const HelpSupport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimName = name.trim();
    const trimEmail = email.trim();
    const trimMessage = message.trim();

    if (!trimName || !trimEmail || !trimMessage) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    if (trimName.length > MAX_NAME || trimEmail.length > MAX_EMAIL || trimMessage.length > MAX_MESSAGE) {
      toast({ title: "Input too long", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimEmail)) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: { name: trimName, email: trimEmail, message: trimMessage },
      });
      if (error) throw error;
      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      setName("");
      setEmail(user?.email || "");
      setMessage("");
    } catch {
      toast({ title: "Message not sent", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 md:max-w-[900px] md:mx-auto md:w-full">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Help & Support</h1>
      </header>

      <main className="px-5 pb-8 md:max-w-[900px] md:mx-auto md:w-full">
        <div className="bg-card rounded-2xl shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold">Get in Touch</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Have feedback, a question, or need help? Send us a message and we'll get back to you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={MAX_NAME}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                maxLength={MAX_EMAIL}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                maxLength={MAX_MESSAGE}
                rows={5}
                required
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/{MAX_MESSAGE}</p>
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cta text-cta-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </main>
    </AppLayout>
  );
};

export default HelpSupport;
