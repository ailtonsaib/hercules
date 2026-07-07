/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appSettings from "../appSettings.js";
import type * as auth from "../auth.js";
import type * as batches from "../batches.js";
import type * as cardTemplates from "../cardTemplates.js";
import type * as cards from "../cards.js";
import type * as crons from "../crons.js";
import type * as draws from "../draws.js";
import type * as emailIdentity from "../emailIdentity.js";
import type * as emailQueries from "../emailQueries.js";
import type * as emails from "../emails.js";
import type * as events from "../events.js";
import type * as helpers from "../helpers.js";
import type * as notifications from "../notifications.js";
import type * as planConfigs from "../planConfigs.js";
import type * as prizeAwards from "../prizeAwards.js";
import type * as regulations from "../regulations.js";
import type * as rifas from "../rifas.js";
import type * as users from "../users.js";
import type * as vendor from "../vendor.js";
import type * as vendorApp from "../vendorApp.js";
import type * as vendors from "../vendors.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appSettings: typeof appSettings;
  auth: typeof auth;
  batches: typeof batches;
  cardTemplates: typeof cardTemplates;
  cards: typeof cards;
  crons: typeof crons;
  draws: typeof draws;
  emailIdentity: typeof emailIdentity;
  emailQueries: typeof emailQueries;
  emails: typeof emails;
  events: typeof events;
  helpers: typeof helpers;
  notifications: typeof notifications;
  planConfigs: typeof planConfigs;
  prizeAwards: typeof prizeAwards;
  regulations: typeof regulations;
  rifas: typeof rifas;
  users: typeof users;
  vendor: typeof vendor;
  vendorApp: typeof vendorApp;
  vendors: typeof vendors;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
