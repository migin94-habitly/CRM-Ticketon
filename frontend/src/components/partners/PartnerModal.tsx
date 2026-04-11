import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { partnersAPI, citiesAPI } from '../../api';
import type { Partner, City } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  partner?: Partner | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function PartnerModal({ partner, onClose, onSaved }: Props) {
  const { register, handleSubmit, reset } = useForm<Partial<Partner>>();
  const [cities, setCities] = useState<City[]>([]);

  useEffect(() => {
    reset(partner || { status: 'active', commission_rate: 0 });
    citiesAPI.list().then(r => setCities((r.data.data as City[]) || []));
  }, [partner, reset]);

  const onSubmit = async (data: Partial<Partner>) => {
    data.commission_rate = parseFloat(String(data.commission_rate ?? 0)) || 0;
    if (!data.city_id) delete data.city_id;
    try {
      if (partner?.id) {
        await partnersAPI.update(partner.id, data);
        toast.success('Партнёр обновлён');
      } else {
        await partnersAPI.create(data);
        toast.success('Партнёр создан');
      }
      onSaved();
    } catch {
      toast.error('Ошибка сохранения партнёра');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
      <div className="card w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="font-semibold text-white">
            {partner ? 'Редактировать партнёра' : 'Новый партнёр'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="label">Название организации *</label>
            <input className="input" {...register('name', { required: true })} placeholder="ООО «Организатор»" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Контактное лицо</label>
              <input className="input" {...register('contact_person')} placeholder="Иван Иванов" />
            </div>
            <div>
              <label className="label">Статус</label>
              <select className="input" {...register('status')}>
                <option value="active">Активный</option>
                <option value="prospect">Лид</option>
                <option value="inactive">Неактивный</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" {...register('email')} placeholder="info@company.kz" />
            </div>
            <div>
              <label className="label">Телефон</label>
              <input className="input" {...register('phone')} placeholder="+7 (777) 000-00-00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Город</label>
              <select className="input" {...register('city_id')}>
                <option value="">— выбрать —</option>
                {cities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Комиссия %</label>
              <input className="input" type="number" step="0.01" min="0" max="100" {...register('commission_rate')} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Номер договора</label>
              <input className="input" {...register('contract_number')} placeholder="№ 123/2024" />
            </div>
            <div>
              <label className="label">Дата договора</label>
              <input className="input" type="date" {...register('contract_date')} />
            </div>
          </div>
          <div>
            <label className="label">Сайт</label>
            <input className="input" {...register('website')} placeholder="https://organizer.kz" />
          </div>
          <div>
            <label className="label">Заметки</label>
            <textarea className="input resize-none" rows={2} {...register('notes')} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Отмена</button>
            <button type="submit" className="btn-primary">Сохранить партнёра</button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
