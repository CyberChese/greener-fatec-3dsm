import { BadRequestException } from '@nestjs/common';

export interface DateRange {
  from?: Date;
  to?: Date;
}

export function parseDateParameter(
  value: string | undefined,
  name: string,
): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(
      `Query parameter "${name}" must be a valid date.`,
    );
  }
  return date;
}

export function parseDateRange(
  fromValue: string | undefined,
  toValue: string | undefined,
  fromName: string,
  toName: string,
): DateRange {
  const from = parseDateParameter(fromValue, fromName);
  const to = parseDateParameter(toValue, toName);
  if (from && to && from > to) {
    throw new BadRequestException(
      `"${fromName}" must be earlier than or equal to "${toName}".`,
    );
  }
  return { from, to };
}
