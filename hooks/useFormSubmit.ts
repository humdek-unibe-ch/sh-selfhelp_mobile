/**
 * Optional helper for screens that want react-hook-form + zod for
 * client-side UX (instant feedback while typing) AND need to map
 * server-side `field_errors` into the same form state.
 *
 * The CMS-driven `form-log` / `form-record` styles do NOT use this —
 * their schemas are dynamic. This is for hand-rolled screens (e.g. a
 * custom checkout, the dev server picker, etc.) where the field set
 * is known at compile time.
 *
 * Usage:
 *   const schema = z.object({ email: z.string().email() });
 *   const { form, submit } = useFormSubmit(schema, async (values) =>
 *       submitForm({ section_id: 123, form_data: values })
 *   );
 */

import { useCallback } from 'react';
import { useForm, type DefaultValues, type FieldValues, type Resolver, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

import type { TFormResult } from '@/services/formsService';

export interface IUseFormSubmitResult<TValues extends FieldValues> {
    form: UseFormReturn<TValues>;
    submit: (vals: TValues) => Promise<TFormResult>;
}

export function useFormSubmit<TValues extends FieldValues>(
    schema: z.ZodType<TValues>,
    submitter: (vals: TValues) => Promise<TFormResult>,
    defaultValues?: DefaultValues<TValues>
): IUseFormSubmitResult<TValues> {
    const form = useForm<TValues>({
        // zodResolver for both zod 3 and zod 4 — the cast keeps the
        // generic narrow on the consumer side. @hookform/resolvers v5
        // overloads on zod 3 vs zod 4 internally; we always go through
        // the resolved schema.
        resolver: zodResolver(schema as never) as Resolver<TValues>,
        defaultValues,
    });

    const submit = useCallback(
        async (vals: TValues): Promise<TFormResult> => {
            const result = await submitter(vals);
            if (result.kind === 'validation') {
                for (const [name, message] of Object.entries(result.fieldErrors)) {
                    form.setError(name as never, { type: 'server', message });
                }
            }
            return result;
        },
        [form, submitter]
    );

    return { form, submit };
}
