import { useState } from 'react';
import { Alert, App, Button, Checkbox, Input, Modal, Space } from 'antd';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { feedbackKey, useFeedbackStore } from '@/store/feedbackStore';

const REASONS = ['内容不准确', '没有解决问题', '内容不完整', '表达不清楚', '其他'];

export default function ResponseFeedback({ sessionId, targetId }: { sessionId: string; targetId: string }) {
  const feedback = useFeedbackStore(s => s.records[feedbackKey(sessionId, targetId)]);
  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const { message } = App.useApp();
  const helpful = () => {
    if (feedback?.sentiment === 'helpful') { useFeedbackStore.getState().remove(sessionId, targetId); return; }
    useFeedbackStore.getState().save({ sessionId, targetId, sentiment: 'helpful', reasons: [], detail: '' });
    message.success('感谢反馈');
  };
  const edit = () => { setReasons(feedback?.reasons ?? []); setDetail(feedback?.detail ?? ''); setError(''); setOpen(true); };
  const submit = () => {
    try {
      useFeedbackStore.getState().save({ sessionId, targetId, sentiment: 'unhelpful', reasons, detail });
      setOpen(false); message.success('反馈已保存，感谢你的建议');
    } catch (error) { setError((error as Error).message); }
  };
  return <>
    <div className="axn-response-feedback" role="group" aria-label="回答反馈">
      <Button type="text" size="small" icon={<ThumbsUp size={14} />} aria-pressed={feedback?.sentiment === 'helpful'} onClick={helpful}>有帮助</Button>
      <Button type="text" size="small" icon={<ThumbsDown size={14} />} aria-pressed={feedback?.sentiment === 'unhelpful'} onClick={edit}>没帮助</Button>
      {feedback && <span className="axn-feedback-saved">已反馈</span>}
    </div>
    <Modal title="反馈这条回答" open={open} onCancel={() => setOpen(false)} footer={<Space wrap>
      {feedback && <Button type="text" onClick={() => { useFeedbackStore.getState().remove(sessionId, targetId); setOpen(false); }}>撤回反馈</Button>}
      <Button onClick={() => setOpen(false)}>取消</Button><Button type="primary" onClick={submit}>提交反馈</Button>
    </Space>}>
      <p>哪些地方需要改进？</p>
      <Checkbox.Group className="axn-feedback-reasons" options={REASONS} value={reasons} onChange={values => { setReasons(values); setError(''); }} />
      <label className="axn-feedback-label" htmlFor={`feedback-${targetId}`}>补充说明（选填）</label>
      <Input.TextArea id={`feedback-${targetId}`} rows={4} maxLength={500} showCount value={detail} placeholder="描述你期望的回答或需要修正的内容"
        onChange={event => { setDetail(event.target.value); setError(''); }} />
      {error && <Alert className="axn-np-mt10" type="error" title={error} />}
    </Modal>
  </>;
}
