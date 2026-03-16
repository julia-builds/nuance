import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logomark from "@/assets/logomark.svg";
import logoword from "@/assets/logoword.svg";

const Footer = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: { name: name.trim(), email: email.trim(), message: message.trim() },
      });
      if (error) throw error;
      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      toast({ title: "Message not sent", description: "Something went wrong. Please try again in a moment.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <footer className="bg-[hsl(220,20%,10%)] text-[hsl(36,15%,90%)]">
      {/* Footer Content - 3 columns */}
      <div className="max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-12 md:gap-16">
          {/* Left: Logomark + tagline + copyright + logoword pinned bottom */}
          <div className="flex flex-col h-full items-start">
            <img src={logomark} alt="Nuance" className="h-10 w-auto" />
            <div className="space-y-4 mt-4">
              <p className="text-sm text-[hsl(220,8%,55%)] leading-relaxed max-w-[200px]">
                Master the nuance
                <br />
                of professional
                <br />
                communication.
              </p>
            </div>
            <div className="mt-auto pt-8">
              <img src={logoword} alt="nuance" className="w-full max-w-[220px] h-auto opacity-95" />
            </div>
            <p className="mt-2 text-xs text-[hsl(220,8%,50%)]">
              © {new Date().getFullYear()} Nuance. All Rights Reserved.
            </p>
          </div>

          {/* Center: Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-widest text-[hsl(220,8%,55%)]">Links</h3>
            <nav className="flex flex-col gap-3">
              <Link to="/auth" className="text-sm hover:text-white transition-colors">
                Log In
              </Link>
              <Link to="/auth" className="text-sm hover:text-white transition-colors">
                Register
              </Link>
              <Link to="/privacy" className="text-sm hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </nav>
          </div>

          {/* Right: Contact Form */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-widest text-[hsl(220,8%,55%)]">Get in Touch</h3>
            <form onSubmit={handleContact} className="space-y-3">
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                className="bg-[hsl(220,18%,15%)] border-[hsl(220,15%,22%)] text-[hsl(36,15%,90%)] placeholder:text-[hsl(220,8%,45%)] h-11 text-sm rounded-xl"
              />
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="bg-[hsl(220,18%,15%)] border-[hsl(220,15%,22%)] text-[hsl(36,15%,90%)] placeholder:text-[hsl(220,8%,45%)] h-11 text-sm rounded-xl"
              />
              <textarea
                placeholder="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={1000}
                rows={3}
                className="w-full rounded-xl bg-[hsl(220,18%,15%)] border border-[hsl(220,15%,22%)] text-[hsl(36,15%,90%)] placeholder:text-[hsl(220,8%,45%)] px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 rounded-xl bg-cta text-cta-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
