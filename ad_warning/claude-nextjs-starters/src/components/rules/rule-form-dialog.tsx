'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { THRESHOLD_FIELDS } from '@/lib/detection/rule-display'
import { ruleFormSchema, type RuleFormValues } from '@/lib/validations/rule'
import type { DetectionRule } from '@/types'

interface RuleFormDialogProps {
  rule: DetectionRule | null
  onClose: () => void
  onSave: (ruleId: string, values: RuleFormValues) => void | Promise<void>
}

export function RuleFormDialog({ rule, onClose, onSave }: RuleFormDialogProps) {
  return (
    <Dialog open={rule !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent>
        {rule && (
          <RuleForm
            key={rule.id}
            rule={rule}
            onClose={onClose}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RuleForm({
  rule,
  onClose,
  onSave,
}: {
  rule: DetectionRule
  onClose: () => void
  onSave: RuleFormDialogProps['onSave']
}) {
  const keys = Object.keys(rule.threshold)
  const scaleOf = (k: string) => THRESHOLD_FIELDS[k]?.scale ?? 1

  // 폼에서는 화면 단위(%)로 다루고, 저장 시 원래 단위(비율)로 되돌린다
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      threshold: Object.fromEntries(
        keys.map(k => [
          k,
          Math.round(rule.threshold[k] * scaleOf(k) * 1000) / 1000,
        ])
      ),
      targetType: rule.target_type ?? 'cpa',
      targetValue: rule.target_value,
      isActive: rule.is_active,
    },
  })

  const submit = (values: RuleFormValues) =>
    onSave(rule.id, {
      ...values,
      threshold: Object.fromEntries(
        keys.map(k => [k, values.threshold[k] / scaleOf(k)])
      ),
    })

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {rule.rule_code} {rule.type} 설정
        </DialogTitle>
        <DialogDescription>
          임계값을 수정하면 다음 조회부터 바로 적용됩니다.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          {keys.map(k => {
            const meta = THRESHOLD_FIELDS[k]
            return (
              <FormField
                key={k}
                control={form.control}
                name={`threshold.${k}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {meta?.label ?? k} ({meta?.unit})
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        {...field}
                        value={Number.isNaN(field.value) ? '' : field.value}
                        onChange={e =>
                          field.onChange(
                            e.target.value === '' ? NaN : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )
          })}

          {rule.rule_code === 'R5' && (
            <>
              <FormField
                control={form.control}
                name="targetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>목표 유형</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cpa">리드형 (목표 CPA)</SelectItem>
                        <SelectItem value="roas">
                          이커머스형 (목표 ROAS)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      목표값 (
                      {form.watch('targetType') === 'roas'
                        ? '배수, 예: 4 = 400%'
                        : '원'}
                      )
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e =>
                          field.onChange(
                            e.target.value === ''
                              ? null
                              : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      비워두면 R5는 평가되지 않습니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">저장</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  )
}
