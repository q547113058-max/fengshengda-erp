// 通用 Form Modal —— 给每个列表页接"新增/编辑"按钮用
import { Modal, Form, Input, InputNumber, Select, DatePicker, Upload, Button, App } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import dayjs from 'dayjs';

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'select' | 'textarea' | 'date' | 'upload';
  required?: boolean;
  options?: { value: string | number; label: string }[];
  placeholder?: string;
  min?: number;
  step?: number;
  span?: number;
  initialValue?: any;
  disabled?: boolean;
}

interface Props {
  open: boolean;
  title: string;
  fields: FieldDef[];
  initial?: Record<string, any>;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
}

export default function EditModal({ open, title, fields, initial = {}, onCancel, onSubmit }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');

  useEffect(() => {
    if (open) {
      const init: any = {};
      fields.forEach(f => {
        let v = initial[f.name] ?? f.initialValue ?? null;
        if (f.type === 'date' && v && typeof v === 'string') v = dayjs(v);
        if (f.type === 'date' && !v) v = null;
        init[f.name] = v;
        if (f.type === 'upload' && v) setFileUrl(v);
      });
      form.setFieldsValue(init);
    }
  }, [open, initial, fields, form]);

  const submit = async () => {
    try {
      const v = await form.validateFields();
      setBusy(true);
      // date 字段转 ISO
      fields.forEach(f => {
        if (f.type === 'date' && v[f.name]) v[f.name] = (v[f.name] as any).format('YYYY-MM-DD');
        if (f.type === 'upload') v[f.name] = fileUrl || '';
      });
      await onSubmit(v);
      message.success('已保存');
      onCancel();
      setFileUrl('');
    } catch (e: any) {
      if (e?.errorFields) return; // 验证失败
      message.error(e?.message || '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      onOk={submit}
      confirmLoading={busy}
      width={620}
      destroyOnClose
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" style={{ paddingTop: 12 }}>
        {fields.map(f => (
          <Form.Item
            key={f.name}
            name={f.name}
            label={f.label}
            rules={f.required ? [{ required: true, message: `请输入${f.label}` }] : []}
          >
            {f.type === 'number' && <InputNumber min={f.min} step={f.step} style={{ width: '100%' }} placeholder={f.placeholder} disabled={f.disabled} />}
            {f.type === 'select' && (
              <Select placeholder={f.placeholder || `请选择${f.label}`} options={f.options || []} allowClear disabled={f.disabled} />
            )}
            {f.type === 'textarea' && <Input.TextArea rows={3} placeholder={f.placeholder} disabled={f.disabled} />}
            {f.type === 'password' && <Input.Password placeholder={f.placeholder} disabled={f.disabled} />}
            {f.type === 'date' && <DatePicker style={{ width: '100%' }} disabled={f.disabled} />}
            {f.type === 'upload' && (
              <Upload
                accept="image/*"
                maxCount={1}
                showUploadList={fileUrl ? { showPreviewIcon: false } : false}
                beforeUpload={async (file) => {
                  setUploading(true);
                  try {
                    const res = await api.uploadFile(file, { type: 'image' });
                    setFileUrl(res.url || res.file_path || res.path || '');
                    message.success('上传成功');
                  } catch (e: any) {
                    message.error('上传失败: ' + (e.message || ''));
                  } finally {
                    setUploading(false);
                  }
                  return false; // 阻止 antd 自动上传
                }}
                onRemove={() => setFileUrl('')}
              >
                <Button icon={<UploadOutlined />} loading={uploading} size="small">选择图片</Button>
              </Upload>
            )}
            {!f.type && <Input placeholder={f.placeholder} disabled={f.disabled} />}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
}
