import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { venuesAPI } from '../../api';
import type { Venue, City } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  venue?: Venue | null;
  cities: City[];
  onClose: () => void;
  onSaved: () => void;
}

export default function VenueModal({ venue, cities, onClose, onSaved }: Props) {
  const { register, handleSubmit, reset } = useForm<Partial<Venue>>();

  useEffect(() => {
    reset(venue || {});
  }, [venue, reset]);

  const onSubmit = async (data: Partial<Venue>) => {
    if (!data.city_id) delete data.city_id;
    if (data.capacity) data.capacity = parseInt(String(data.capacity)) || undefined;
    try {
      if (venue?.id) {
        await venuesAPI.update(venue.id, data);
        toast.success('Площадка обновлена');
      } else {
        await venuesAPI.create(data);
        toast.success('Площадка создана');
      }
      onSaved();
    } catch {
      toast.error('Ошибка сохранения площадки');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="font-semibold text-white">
            {venue ? 'Редактировать площадку' : 'Новая площадка'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="label">Название *</label>
            <input className="input" {...register('name', { required: true })} placeholder="Дворец спорта «Балуан Шолак»" />
          </div>
          <div>
            <label className="label">Адрес</label>
            <input className="input" {...register('address')} placeholder="ул. Абая, 5, Алматы" />
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
              <label className="label">Вместимость</label>
              <input className="input" type="number" min="0" {...register('capacity')} placeholder="12000" />
            </div>
          </div>
          <div>
            <label className="label">Описание</label>
            <textarea className="input resize-none" rows={2} {...register('description')} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Отмена</button>
            <button type="submit" className="btn-primary">Сохранить площадку</button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
