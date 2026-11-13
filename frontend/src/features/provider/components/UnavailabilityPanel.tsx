import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Notice from "@/components/ui/Notice";
import TextInput from "@/components/ui/TextInput";
import { combineLocal, formatDateTime, localDateValue, localTimeValue } from "@/lib/datetime";
import { errorMessage } from "@/lib/errors";

export type UnavailabilityBlock = {
  id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
  created_at: string;
};

export type UnavailabilityInput = {
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
};

type Props = {
  queryKey: readonly unknown[];
  fetchBlocks: () => Promise<UnavailabilityBlock[]>;
  createBlock: (input: UnavailabilityInput) => Promise<UnavailabilityBlock>;
  deleteBlock: (blockId: string) => Promise<void>;
};

const blockSchema = z
  .object({
    startDate: z.string().min(1, "Choose a start date."),
    startTime: z.string().min(1, "Choose a start time."),
    endDate: z.string().min(1, "Choose an end date."),
    endTime: z.string().min(1, "Choose an end time."),
    reason: z.string().max(255, "Use at most 255 characters."),
  })
  .refine((value) => combineLocal(value.endDate, value.endTime) > combineLocal(value.startDate, value.startTime), {
    message: "The end must be after the start.",
    path: ["endTime"],
  });

type BlockValues = z.infer<typeof blockSchema>;

function defaultWindow(): BlockValues {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(8, 0, 0, 0);
  const end = new Date(start);
  end.setHours(16, 0, 0, 0);
  return {
    startDate: localDateValue(start),
    startTime: localTimeValue(start),
    endDate: localDateValue(end),
    endTime: localTimeValue(end),
    reason: "",
  };
}

export default function UnavailabilityPanel({
  queryKey,
  fetchBlocks,
  createBlock,
  deleteBlock,
}: Props) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BlockValues>({
    resolver: zodResolver(blockSchema),
    defaultValues: defaultWindow(),
  });

  const blocks = useQuery({ queryKey, queryFn: fetchBlocks, retry: false });

  const create = useMutation({
    mutationFn: (values: BlockValues) =>
      createBlock({
        start_datetime: combineLocal(values.startDate, values.startTime).toISOString(),
        end_datetime: combineLocal(values.endDate, values.endTime).toISOString(),
        reason: values.reason.trim() || null,
      }),
    onSuccess: () => {
      reset(defaultWindow());
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const remove = useMutation({
    mutationFn: deleteBlock,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div>
        <h3 className="text-sm font-semibold text-ink-900">Unavailability</h3>
        <p className="text-xs text-ink-500">
          Blocked windows are excluded from availability checks and conflict previews.
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit((values) => create.mutate(values))}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <TextInput
          label="From date"
          type="date"
          required
          error={errors.startDate?.message}
          {...register("startDate")}
        />
        <TextInput
          label="From time"
          type="time"
          required
          error={errors.startTime?.message}
          {...register("startTime")}
        />
        <TextInput
          label="To date"
          type="date"
          required
          error={errors.endDate?.message}
          {...register("endDate")}
        />
        <TextInput
          label="To time"
          type="time"
          required
          error={errors.endTime?.message}
          {...register("endTime")}
        />
        <div className="sm:col-span-2 lg:col-span-3">
          <TextInput
            label="Reason (optional)"
            maxLength={255}
            error={errors.reason?.message}
            {...register("reason")}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full" isLoading={create.isPending}>
            Add block
          </Button>
        </div>
      </form>

      {create.isError ? <Notice tone="error">{errorMessage(create.error)}</Notice> : null}

      {blocks.isPending ? <LoadingState label="Loading blocks" rows={1} /> : null}
      {blocks.isError ? (
        <ErrorState
          message={errorMessage(blocks.error)}
          onRetry={() => {
            void blocks.refetch();
          }}
        />
      ) : null}

      {blocks.data ? (
        blocks.data.length === 0 ? (
          <EmptyState title="No blocks" description="This resource is available at all times." />
        ) : (
          <ul className="space-y-2">
            {blocks.data.map((block) => (
              <li
                key={block.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-ink-900">
                    {formatDateTime(block.start_datetime)} → {formatDateTime(block.end_datetime)}
                  </p>
                  {block.reason ? <p className="text-xs text-ink-500">{block.reason}</p> : null}
                </div>
                <Button
                  variant="danger"
                  disabled={remove.isPending}
                  isLoading={remove.isPending && remove.variables === block.id}
                  onClick={() => remove.mutate(block.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {remove.isError ? <Notice tone="error">{errorMessage(remove.error)}</Notice> : null}
    </div>
  );
}
