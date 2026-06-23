import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Coins, Loader2, Shield, CheckCircle2, ExternalLink, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const OFFERS = [
  { gold: 1000, usd: 1 },
  { gold: 5000, usd: 4 },
  { gold: 15000, usd: 10 },
  { gold: 50000, usd: 30 },
];

const NETWORKS = [
  { id: 'usdttrc20', label: 'USDT • TRC20', sub: 'Tron — lowest fees' },
  { id: 'usdtbsc', label: 'USDT • BEP20', sub: 'BNB Smart Chain' },
  { id: 'usdterc20', label: 'USDT • ERC20', sub: 'Ethereum' },
] as const;

type Network = typeof NETWORKS[number]['id'];
type Step = 'offers' | 'network' | 'paying' | 'status' | 'error';

export default function BuyGold({ gold, compact }: any) {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('offers');
  const [offer, setOffer] = useState<any>(null);
  const [network, setNetwork] = useState<Network>('usdttrc20');

  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);

  const [paymentStatus, setPaymentStatus] = useState('waiting');
  const [credited, setCredited] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [errorDetail, setErrorDetail] = useState('');

  const pollRef = useRef<any>(null);

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);

    setStep('offers');
    setOffer(null);
    setInvoiceUrl('');
    setOrderId(null);
    setPaymentStatus('waiting');
    setCredited(false);
    setErrorMsg('');
    setErrorDetail('');
  };

  useEffect(() => {
    if (step !== 'status' || !orderId) return;

    const channel = supabase
      .channel(`payments:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `id=eq.${orderId}` },
        (payload: any) => {
          setPaymentStatus(payload.new?.status);
          setCredited(!!payload.new?.credited);
        }
      )
      .subscribe();

    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('payments')
        .select('status, credited')
        .eq('id', orderId)
        .maybeSingle();

      if (data) {
        setPaymentStatus(data.status);
        setCredited(!!data.credited);
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollRef.current);
    };
  }, [step, orderId]);

  const submit = async () => {
    if (!offer || !user) return;

    setStep('paying');
    setErrorMsg('');
    setErrorDetail('');

    try {
      const client_nonce = crypto.randomUUID();

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          gold_amount: offer.gold,
          amount_usd: offer.usd,

          // 🔥 IMPORTANT FIX
          pay_currency: network, // لازم Edge Function يدعمها

          client_nonce,
        },
      });

      if (error) throw new Error(error.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Payment failed');
      }

      setInvoiceUrl(data.invoice_url);
      setOrderId(data.order_id);
      setPaymentStatus(data.payment?.status || 'waiting');
      setStep('status');

      toast.success('Payment created');
    } catch (err: any) {
      setErrorMsg(err.message);
      setErrorDetail(JSON.stringify(err, null, 2));
      setStep('error');

      toast.error('Payment failed');
    }
  };

  const STATUS: any = {
    waiting: 'Waiting payment',
    confirming: 'Confirming',
    confirmed: 'Confirmed',
    finished: 'Completed',
    failed: 'Failed',
    expired: 'Expired',
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <button className="px-3 py-1 text-yellow-300 border border-yellow-500/40 rounded">
          💰 {gold}
        </button>
      </DialogTrigger>

      <DialogContent className="bg-black text-white">

        <DialogHeader>
          <DialogTitle>GOLD EXCHANGE</DialogTitle>
          <DialogDescription>SETVOID Payments</DialogDescription>
        </DialogHeader>

        {/* OFFERS */}
        {step === 'offers' && (
          <div className="space-y-2">
            {OFFERS.map((o) => (
              <button
                key={o.gold}
                onClick={() => { setOffer(o); setStep('network'); }}
                className="w-full p-2 border rounded"
              >
                {o.gold} GOLD - ${o.usd}
              </button>
            ))}
          </div>
        )}

        {/* NETWORK */}
        {step === 'network' && (
          <div className="space-y-2">
            {NETWORKS.map((n) => (
              <button
                key={n.id}
                onClick={() => setNetwork(n.id)}
                className={`w-full p-2 border rounded ${network === n.id ? 'bg-yellow-500 text-black' : ''}`}
              >
                {n.label}
              </button>
            ))}

            <Button onClick={submit} className="w-full bg-yellow-500 text-black">
              Continue
            </Button>
          </div>
        )}

        {/* LOADING */}
        {step === 'paying' && (
          <div className="p-10 text-center">
            <Loader2 className="animate-spin mx-auto" />
            Creating payment...
          </div>
        )}

        {/* STATUS */}
        {step === 'status' && (
          <div className="space-y-3">
            <div className="border p-3 rounded">
              Status: {STATUS[paymentStatus] || paymentStatus}
              {credited && ' ✓ GOLD ADDED'}
            </div>

            {invoiceUrl && (
              <a href={invoiceUrl} target="_blank" className="text-blue-400">
                Open Payment
              </a>
            )}
          </div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <div className="text-red-400 space-y-2">
            <div>{errorMsg}</div>
            <pre className="text-xs">{errorDetail}</pre>
            <Button onClick={reset}>Retry</Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
