-- Create promotional_bars table for rotating top bar messages
CREATE TABLE IF NOT EXISTS public.promotional_bars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  background_color TEXT NOT NULL DEFAULT 'hsl(var(--destructive))',
  text_color TEXT NOT NULL DEFAULT 'hsl(var(--destructive-foreground))',
  icon TEXT DEFAULT '🔥',
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_countdown BOOLEAN NOT NULL DEFAULT false,
  end_date TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotional_bars ENABLE ROW LEVEL SECURITY;

-- Anyone can view active promotional bars
CREATE POLICY "Anyone can view active promotional bars"
  ON public.promotional_bars
  FOR SELECT
  USING (is_active = true);

-- Admins can manage promotional bars
CREATE POLICY "Admins can manage promotional bars"
  ON public.promotional_bars
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_promotional_bars_updated_at
  BEFORE UPDATE ON public.promotional_bars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();