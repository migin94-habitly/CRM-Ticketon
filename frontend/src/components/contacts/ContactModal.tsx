import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { contactsAPI } from '../../api';
import type { Contact } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  contact?: Contact | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ContactModal({ contact, onClose, onSaved }: Props) {
  const { register, handleSubmit, reset } = useForm<Partial<Contact>>();

  useEffect(() => {
    reset(contact || { status: 'new' });
  }, [contact, reset]);

  const onSubmit = async (data: Partial<Contact>) => {
    try {
      if (contact?.id) {
        await contactsAPI.update(contact.id, data);
        toast.success('Контакт обновлён');
      } else {
        await contactsAPI.create(data);
        toast.success('Контакт создан');
      }
      onSaved();
    } catch {
      toast.error('Ошибка сохранения контакта');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
      <div className="card w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="font-semibold text-white">{contact ? 'Редактировать контакт' : 'Новый контакт'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Имя *</label>
              <input className="input" {...register('first_name', { required: true })} />
            </div>
            <div>
              <label className="label">Фамилия *</label>
              <input className="input" {...register('last_name', { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" {...register('email')} />
            </div>
            <div>
              <label className="label">Телефон</label>
              <input className="input" type="tel" {...register('phone')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Компания</label>
              <input className="input" {...register('company')} />
            </div>
            <div>
              <label className="label">Должность</label>
              <input className="input" {...register('position')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Статус</label>
              <select className="input" {...register('status')}>
                <option value="new">Новый</option>
                <option value="active">Активный</option>
                <option value="inactive">Неактивный</option>
                <option value="lost">Потерян</option>
              </select>
            </div>
            <div>
              <label className="label">Источник</label>
              <select className="input" {...register('source')}>
                <option value="">Нет</option>
                <option value="website">Веб-сайт</option>
                <option value="referral">Рекомендация</option>
                <option value="cold_call">Холодный звонок</option>
                <option value="linkedin">LinkedIn</option>
                <option value="event">Мероприятие</option>
                <option value="other">Другое</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Заметки</label>
            <textarea className="input resize-none" rows={2} {...register('notes')} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Отмена</button>
            <button type="submit" className="btn-primary">Сохранить контакт</button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
