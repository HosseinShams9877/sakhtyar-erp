'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Check,
  Search,
  Package,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toPersianDigits, formatCurrency, toPersianDate, toShamsi } from '@/lib/persian';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Project { id: string; name: string; }
interface Supplier { id: string; companyName: string; }
interface Purchase {
  id: string; invoiceNumber: string; projectId: string; supplierId: string;
  purchaseDate: string; dueDate: string; totalAmount: number; paidAmount: number;
  status: string; delivery: any | null;
  project?: Project; supplier?: Supplier;
  items: any[];
}
interface Delivery {
  id: string; purchaseId: string; projectId: string;
  deliveryDate: string; confirmedBy: string; notes: string | null;
  purchase?: Purchase;
}

export default function DeliveryPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [undelivered, setUndelivered] = useState<Purchase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [formPurchaseId, setFormPurchaseId] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formConfirmedBy, setFormConfirmedBy] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [dRes, uRes, pRes] = await Promise.all([
        fetch('/api/deliveries'),
        fetch('/api/purchases?status=pending'),
        fetch('/api/projects'),
      ]);
      if (dRes.ok) setDeliveries(await dRes.json());
      if (uRes.ok) {
        const purchases = await uRes.json();
        setUndelivered(purchases.filter((p: Purchase) => !p.delivery));
      }
      if (pRes.ok) setProjects(await pRes.json());
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleConfirm = async () => {
    if (!formPurchaseId || !formProjectId || !formConfirmedBy) {
      toast.error('لطفاً تمام فیلدهای الزامی را پر کنید');
      return;
    }
    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId: formPurchaseId,
          projectId: formProjectId,
          confirmedBy: formConfirmedBy,
          notes: formNotes || undefined,
        }),
      });
      if (res.ok) {
        toast.success('تحویل مصالح تأیید شد');
        setShowForm(false);
        setFormPurchaseId(''); setFormProjectId(''); setFormConfirmedBy(''); setFormNotes('');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'خطا');
      }
    } catch { toast.error('خطا'); }
  };

  const filteredDeliveries = deliveries.filter(d =>
    !search || d.purchase?.invoiceNumber?.includes(search) || d.confirmedBy.includes(search) || d.purchase?.project?.name?.includes(search)
  );

  const filteredUndelivered = undelivered.filter(p =>
    !search || p.invoiceNumber.includes(search) || p.project?.name?.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">تحویل مصالح</h1>
          <p className="text-sm text-muted-foreground mt-1">تأیید تحویل مصالح خریداری‌شده به پروژه</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gradient-primary text-white border-0 gap-2">
          <Truck className="w-4 h-4" />
          ثبت تحویل
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
      </div>

      {/* Pending deliveries */}
      {filteredUndelivered.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Package className="w-5 h-5 text-yellow-500" />
            در انتظار تحویل ({toPersianDigits(filteredUndelivered.length)})
          </h2>
          <div className="space-y-2">
            {filteredUndelivered.map(p => (
              <Card key={p.id} className="shadow-soft">
                <CardContent className="py-3 px-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">فاکتور {toPersianDigits(p.invoiceNumber)}</span>
                      <span className="text-muted-foreground text-xs">•</span>
                      <span className="text-sm text-muted-foreground">{p.project?.name}</span>
                      <span className="text-muted-foreground text-xs">•</span>
                      <span className="text-sm text-muted-foreground">{p.supplier?.companyName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.items?.map(i => `${i.materialName} (${toPersianDigits(i.quantity)} ${i.unit})`).join('، ')}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                    setFormPurchaseId(p.id);
                    setFormProjectId(p.projectId);
                    setShowForm(true);
                  }}>
                    <Check className="w-3.5 h-3.5" />
                    تأیید تحویل
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Delivered */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-500" />
          تحویل‌شده ({toPersianDigits(filteredDeliveries.length)})
        </h2>
        {filteredDeliveries.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Truck className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">هنوز تحویلی ثبت نشده</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredDeliveries.map(d => (
              <Card key={d.id} className="shadow-soft border-r-2 border-r-emerald-500">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">فاکتور {toPersianDigits(d.purchase?.invoiceNumber ?? '')}</span>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-sm text-muted-foreground">{d.purchase?.project?.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>تحویل‌گیرنده: {d.confirmedBy}</span>
                        <span>تاریخ: {toPersianDate(d.deliveryDate)}</span>
                        {d.notes && <span>یادداشت: {d.notes}</span>}
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]" variant="secondary">
                      تحویل‌شده
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Delivery Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setFormPurchaseId(''); setFormProjectId(''); setFormConfirmedBy(''); setFormNotes(''); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأیید تحویل مصالح</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>فاکتور *</Label>
              <Select value={formPurchaseId} onValueChange={v => {
                setFormPurchaseId(v);
                const p = undelivered.find(x => x.id === v);
                if (p) setFormProjectId(p.projectId);
              }}>
                <SelectTrigger><SelectValue placeholder="انتخاب فاکتور" /></SelectTrigger>
                <SelectContent>
                  {undelivered.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      فاکتور {p.invoiceNumber} — {p.project?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>پروژه تحویل *</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger><SelectValue placeholder="انتخاب پروژه" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نام مسئول تحویل *</Label>
              <Input value={formConfirmedBy} onChange={e => setFormConfirmedBy(e.target.value)} placeholder="نام انباردار" />
            </div>
            <div className="space-y-2">
              <Label>یادداشت</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="اختیاری..." rows={2} />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
              <Button onClick={handleConfirm} className="gradient-primary text-white border-0">تأیید تحویل</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
