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
        toast.success('Contact updated');
      } else {
        await contactsAPI.create(data);
        toast.success('Contact created');
      }
      onSaved();
    } catch {
      toast.error('Failed to save contact');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="font-semibold text-white">{contact ? 'Edit Contact' : 'New Contact'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name *</label>
              <input className="input" {...register('first_name', { required: true })} />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input" {...register('last_name', { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" {...register('email')} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" {...register('phone')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Company</label>
              <input className="input" {...register('company')} />
            </div>
            <div>
              <label className="label">Position</label>
              <input className="input" {...register('position')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select className="input" {...register('status')}>
                <option value="new">New</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="label">Source</label>
              <select className="input" {...register('source')}>
                <option value="">None</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="cold_call">Cold Call</option>
                <option value="linkedin">LinkedIn</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} {...register('notes')} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Contact</button>
          </div>
        </form>
      </div>
    </div>
  );
}
