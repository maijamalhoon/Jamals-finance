begin;

alter function public.delete_liability_payment_transaction(uuid)
  security invoker;

commit;
