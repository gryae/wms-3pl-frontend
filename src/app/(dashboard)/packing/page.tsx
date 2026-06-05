'use strict';
import { redirect } from 'next/navigation';

export default function PackingRedirect() {
  redirect('/fulfillment');
}
