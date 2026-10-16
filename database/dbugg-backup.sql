--
-- PostgreSQL database dump
--

\restrict GU1Cb9VuTL5N6pf9fzxC8UucRJKtOQBayuA7oj7gXpI190FJsZu2j6wEwhOHLhD

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: commissions_status_enum; Type: TYPE; Schema: public; Owner: dbugg
--

CREATE TYPE public.commissions_status_enum AS ENUM (
    'pending',
    'approved',
    'paid',
    'cancelled'
);


ALTER TYPE public.commissions_status_enum OWNER TO dbugg;

--
-- Name: dealers_status_enum; Type: TYPE; Schema: public; Owner: dbugg
--

CREATE TYPE public.dealers_status_enum AS ENUM (
    'pending',
    'active',
    'suspended',
    'rejected'
);


ALTER TYPE public.dealers_status_enum OWNER TO dbugg;

--
-- Name: dealers_tier_enum; Type: TYPE; Schema: public; Owner: dbugg
--

CREATE TYPE public.dealers_tier_enum AS ENUM (
    'silver',
    'gold',
    'platinum'
);


ALTER TYPE public.dealers_tier_enum OWNER TO dbugg;

--
-- Name: kyc_documents_status_enum; Type: TYPE; Schema: public; Owner: dbugg
--

CREATE TYPE public.kyc_documents_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.kyc_documents_status_enum OWNER TO dbugg;

--
-- Name: kyc_documents_type_enum; Type: TYPE; Schema: public; Owner: dbugg
--

CREATE TYPE public.kyc_documents_type_enum AS ENUM (
    'aadhaar',
    'pan',
    'passport',
    'driving_license',
    'gstin',
    'utility_bill'
);


ALTER TYPE public.kyc_documents_type_enum OWNER TO dbugg;

--
-- Name: laptops_grade_enum; Type: TYPE; Schema: public; Owner: dbugg
--

CREATE TYPE public.laptops_grade_enum AS ENUM (
    'A+',
    'A',
    'B',
    'C'
);


ALTER TYPE public.laptops_grade_enum OWNER TO dbugg;

--
-- Name: laptops_status_enum; Type: TYPE; Schema: public; Owner: dbugg
--

CREATE TYPE public.laptops_status_enum AS ENUM (
    'in_qc',
    'available',
    'rented',
    'sold',
    'repair',
    'reserved'
);


ALTER TYPE public.laptops_status_enum OWNER TO dbugg;

--
-- Name: orders_status_enum; Type: TYPE; Schema: public; Owner: dbugg
--

CREATE TYPE public.orders_status_enum AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'return_requested',
    'returned'
);


ALTER TYPE public.orders_status_enum OWNER TO dbugg;

--
-- Name: orders_type_enum; Type: TYPE; Schema: public; Owner: dbugg
--

CREATE TYPE public.orders_type_enum AS ENUM (
    'b2c',
    'b2b',
    'rental',
    'dealer'
);


ALTER TYPE public.orders_type_enum OWNER TO dbugg;

--
-- Name: payments_status_enum; Type: TYPE; Schema: public; Owner: dbugg
--

CREATE TYPE public.payments_status_enum AS ENUM (
    'created',
    'captured',
    'failed',
    'refunded'
);


ALTER TYPE public.payments_status_enum OWNER TO dbugg;

--
-- Name: rentals_status_enum; Type: TYPE; Schema: public; Owner: dbugg
--

CREATE TYPE public.rentals_status_enum AS ENUM (
    'kyc_pending',
    'kyc_approved',
    'deposit_pending',
    'active',
    'overdue',
    'return_requested',
    'returned',
    'closed',
    'mobile_verified',
    'pan_verified',
    'credit_check',
    'manual_review',
    'rejected',
    'approved'
);


ALTER TYPE public.rentals_status_enum OWNER TO dbugg;

--
-- Name: users_kycstatus_enum; Type: TYPE; Schema: public; Owner: dbugg
--

CREATE TYPE public.users_kycstatus_enum AS ENUM (
    'pending',
    'submitted',
    'approved',
    'rejected'
);


ALTER TYPE public.users_kycstatus_enum OWNER TO dbugg;

--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: dbugg
--

CREATE TYPE public.users_role_enum AS ENUM (
    'b2c',
    'b2b',
    'renter',
    'dealer',
    'admin',
    'super_admin'
);


ALTER TYPE public.users_role_enum OWNER TO dbugg;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: dbugg
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "adminId" character varying NOT NULL,
    action character varying NOT NULL,
    entity character varying NOT NULL,
    "entityId" character varying,
    before text,
    after text,
    "ipAddress" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO dbugg;

--
-- Name: b2b_buyers; Type: TABLE; Schema: public; Owner: dbugg
--

CREATE TABLE public.b2b_buyers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" character varying NOT NULL,
    gstin character varying,
    "companyName" character varying,
    address character varying,
    "creditLimit" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "creditUsed" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "isApproved" boolean DEFAULT false NOT NULL,
    "approvedAt" timestamp without time zone,
    "approvedBy" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.b2b_buyers OWNER TO dbugg;

--
-- Name: commissions; Type: TABLE; Schema: public; Owner: dbugg
--

CREATE TABLE public.commissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "dealerId" character varying NOT NULL,
    "orderId" character varying NOT NULL,
    "saleAmount" numeric(10,2) NOT NULL,
    "commissionRate" numeric(5,2) NOT NULL,
    "commissionAmount" numeric(10,2) NOT NULL,
    "tdsAmount" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "netAmount" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    status public.commissions_status_enum DEFAULT 'pending'::public.commissions_status_enum NOT NULL,
    "payoutId" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.commissions OWNER TO dbugg;

--
-- Name: dealers; Type: TABLE; Schema: public; Owner: dbugg
--

CREATE TABLE public.dealers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" character varying NOT NULL,
    gstin character varying,
    "companyName" character varying,
    "bankDetails" text,
    tier public.dealers_tier_enum DEFAULT 'silver'::public.dealers_tier_enum NOT NULL,
    territory character varying,
    "agreementUrl" character varying,
    status public.dealers_status_enum DEFAULT 'pending'::public.dealers_status_enum NOT NULL,
    "commissionRate" numeric(5,2),
    "walletBalance" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "approvedBy" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dealers OWNER TO dbugg;

--
-- Name: kyc_documents; Type: TABLE; Schema: public; Owner: dbugg
--

CREATE TABLE public.kyc_documents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" character varying NOT NULL,
    type public.kyc_documents_type_enum NOT NULL,
    "docUrlEncrypted" character varying NOT NULL,
    "selfieUrl" character varying,
    "faceMatchScore" numeric(5,2),
    "maskedId" character varying,
    status public.kyc_documents_status_enum DEFAULT 'pending'::public.kyc_documents_status_enum NOT NULL,
    "rejectionReason" character varying,
    "reviewedBy" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.kyc_documents OWNER TO dbugg;

--
-- Name: laptop_qc; Type: TABLE; Schema: public; Owner: dbugg
--

CREATE TABLE public.laptop_qc (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "laptopId" character varying NOT NULL,
    "technicianId" character varying NOT NULL,
    checklist text,
    "batteryPercent" numeric(5,2),
    photos text[],
    "reportPdfUrl" character varying,
    "partsReplaced" character varying,
    "adminNotes" character varying,
    "gradedAs" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.laptop_qc OWNER TO dbugg;

--
-- Name: laptops; Type: TABLE; Schema: public; Owner: dbugg
--

CREATE TABLE public.laptops (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "serialNo" character varying NOT NULL,
    brand character varying NOT NULL,
    model character varying NOT NULL,
    processor character varying,
    ram character varying,
    storage character varying,
    display character varying,
    grade public.laptops_grade_enum,
    status public.laptops_status_enum DEFAULT 'in_qc'::public.laptops_status_enum NOT NULL,
    "warehouseId" character varying,
    "sellingPrice" numeric(10,2),
    "rentalPrice" numeric(10,2),
    "dealerPrice" numeric(10,2),
    "wholesalePrice" numeric(10,2),
    "warrantyMonths" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.laptops OWNER TO dbugg;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: dbugg
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "orderNumber" character varying NOT NULL,
    "userId" character varying NOT NULL,
    "laptopId" character varying NOT NULL,
    type public.orders_type_enum NOT NULL,
    status public.orders_status_enum DEFAULT 'pending'::public.orders_status_enum NOT NULL,
    amount numeric(10,2) NOT NULL,
    "gstAmount" numeric(10,2),
    "gstInvoiceUrl" character varying,
    "shipmentId" character varying,
    "trackingId" character varying,
    "shippingAddress" character varying,
    "paymentId" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.orders OWNER TO dbugg;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: dbugg
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "entityId" character varying NOT NULL,
    "entityType" character varying NOT NULL,
    "razorpayOrderId" character varying,
    "razorpayPaymentId" character varying,
    amount numeric(10,2) NOT NULL,
    currency character varying DEFAULT 'INR'::character varying NOT NULL,
    status public.payments_status_enum DEFAULT 'created'::public.payments_status_enum NOT NULL,
    method character varying,
    "refundId" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payments OWNER TO dbugg;

--
-- Name: rentals; Type: TABLE; Schema: public; Owner: dbugg
--

CREATE TABLE public.rentals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" character varying NOT NULL,
    "laptopId" character varying NOT NULL,
    "monthlyRent" numeric(10,2) NOT NULL,
    "depositAmount" numeric(10,2) NOT NULL,
    "autopayId" character varying,
    "agreementUrl" character varying,
    status public.rentals_status_enum DEFAULT 'kyc_pending'::public.rentals_status_enum NOT NULL,
    "startDate" timestamp without time zone,
    "nextDueDate" timestamp without time zone,
    "lateFee" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "returnDate" timestamp without time zone,
    "depositRefund" numeric(10,2),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    tenure integer DEFAULT 6 NOT NULL,
    "panNumber" character varying(10),
    "mobileVerified" boolean DEFAULT false NOT NULL,
    "monthlyIncome" numeric(12,2),
    "employmentType" character varying(50),
    "creditScore" integer,
    "creditStatus" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "totalPayable" numeric(12,2),
    "processingFee" numeric(10,2) DEFAULT 0 NOT NULL,
    "rejectionReason" text,
    "approvedBy" character varying,
    "approvedAt" timestamp without time zone,
    "emiSchedule" jsonb
);


ALTER TABLE public.rentals OWNER TO dbugg;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: dbugg
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role character varying NOT NULL,
    page character varying NOT NULL,
    "canView" boolean DEFAULT true NOT NULL,
    "canCreate" boolean DEFAULT false NOT NULL,
    "canEdit" boolean DEFAULT false NOT NULL,
    "canDelete" boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO dbugg;

--
-- Name: users; Type: TABLE; Schema: public; Owner: dbugg
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying,
    phone character varying NOT NULL,
    email character varying,
    password character varying,
    role public.users_role_enum DEFAULT 'b2c'::public.users_role_enum NOT NULL,
    "kycStatus" public.users_kycstatus_enum DEFAULT 'pending'::public.users_kycstatus_enum NOT NULL,
    "fcmToken" character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO dbugg;

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: dbugg
--

COPY public.audit_logs (id, "adminId", action, entity, "entityId", before, after, "ipAddress", "createdAt") FROM stdin;
39326d13-f459-4987-9d68-3a3476840f22	826b0907-2cea-4cd8-a2bc-2089649d94fa	LOGIN	user	826b0907-2cea-4cd8-a2bc-2089649d94fa	\N	\N	103.21.58.10	2026-10-04 19:48:01.036998
91e02a85-c561-4319-bafc-05f37960c50f	826b0907-2cea-4cd8-a2bc-2089649d94fa	APPROVE	b2b	5b57b5e6-b787-4fc7-96e0-06c1306fc1d7	\N	\N	49.36.200.5	2026-10-04 15:48:01.039827
b3290972-417c-4af9-ad41-4acf3f36121a	826b0907-2cea-4cd8-a2bc-2089649d94fa	APPROVE	kyc	1e35a661-841d-4ca3-8d49-b6137ddaef63	\N	\N	122.177.30.44	2026-10-04 11:48:01.04179
0de03f12-c34f-4a2a-827b-ccab8bacc8b4	826b0907-2cea-4cd8-a2bc-2089649d94fa	REJECT	kyc	32bc9f33-1e62-43fd-9c4d-fb7e823f2ac2	\N	\N	117.221.60.15	2026-10-04 07:48:01.043098
c58a4a44-c1ec-4575-aab6-fe5542362ce0	826b0907-2cea-4cd8-a2bc-2089649d94fa	APPROVE	dealer	f184fdd1-43a4-45cd-a9c3-d8707f74c934	\N	\N	106.51.88.200	2026-10-04 03:48:01.044426
49f84621-14ad-4b60-8074-ba47a92c974a	826b0907-2cea-4cd8-a2bc-2089649d94fa	UPDATE	laptop	e1a2f211-9cf6-46cb-9f5d-1f4b81a6f41a	\N	\N	49.204.85.33	2026-10-03 23:48:01.045441
75e0191e-c674-4643-8c38-87d4e0ead723	826b0907-2cea-4cd8-a2bc-2089649d94fa	UPDATE	order	52077d92-f55a-4737-8ce4-c7c7159210c9	\N	\N	43.239.216.10	2026-10-03 19:48:01.046485
51dcee91-299e-4e7b-826a-f938dd4ab892	826b0907-2cea-4cd8-a2bc-2089649d94fa	CREATE	laptop	fad75a1f-741d-41f1-a7ba-536c01d1b614	\N	\N	103.44.190.5	2026-10-03 15:48:01.04819
da8a84f6-abce-4df6-bb3c-151beb98e1dd	826b0907-2cea-4cd8-a2bc-2089649d94fa	EXPORT	invoice	\N	\N	\N	117.96.44.200	2026-10-03 11:48:01.049264
fb894620-5265-455e-8b94-9e27479bea6f	826b0907-2cea-4cd8-a2bc-2089649d94fa	SETTINGS	pricing	\N	\N	\N	122.161.50.15	2026-10-03 07:48:01.050044
\.


--
-- Data for Name: b2b_buyers; Type: TABLE DATA; Schema: public; Owner: dbugg
--

COPY public.b2b_buyers (id, "userId", gstin, "companyName", address, "creditLimit", "creditUsed", "isApproved", "approvedAt", "approvedBy", "createdAt", "updatedAt") FROM stdin;
7acfb35b-c206-4065-95ab-1b937630a7f9	5b57b5e6-b787-4fc7-96e0-06c1306fc1d7	36AAACT2727Q1ZS	TechCorp Pvt Ltd	Cyber Towers, Hyderabad 500081	500000.00	125000.00	t	\N	\N	2026-10-04 19:48:00.971046	2026-10-04 19:48:00.971046
21ab7bba-580e-46f8-b368-b07433ab8acb	9bb6a6bd-0325-4c3e-8140-99b551300a39	29AAACI1681G1ZX	Infosys Limited	Electronics City, Bangalore 560100	1000000.00	320000.00	t	\N	\N	2026-10-04 19:48:00.972763	2026-10-04 19:48:00.972763
c96cd800-3c60-4ee2-8d3d-a70b1494d413	478ca155-481e-4e40-a981-9fe4db69ceda	29AABCW1234N1ZP	Wipro Solutions Ltd	Whitefield, Bangalore 560066	750000.00	0.00	f	\N	\N	2026-10-04 19:48:00.975178	2026-10-04 19:48:00.975178
6b90fe73-c3b3-4ea3-8a29-c708ebbe90ae	f139bc6d-d5ff-4d84-8168-b74fbe51fc27	27AABCH1234N1ZP	HCL Technologies Ltd	Sector 126, Noida 201301	800000.00	210000.00	t	\N	\N	2026-10-04 19:48:00.97699	2026-10-04 19:48:00.97699
7ce8b267-7fc2-44a7-ae1f-50d07c628627	8e6876ad-309c-43f2-8936-283337c8e8fb	33AAACT9876Q1ZT	Tata Consultancy	TCS House, Mumbai 400093	1200000.00	450000.00	t	\N	\N	2026-10-04 19:48:00.9789	2026-10-04 19:48:00.9789
9ea5c035-9299-494d-b41e-177f0528b6bf	826b0907-2cea-4cd8-a2bc-2089649d94fa	07AABCN1234M1ZQ	MindTree Solutions	Bagmane Tech Park, Bangalore 560093	300000.00	80000.00	f	\N	\N	2026-10-04 19:48:00.980397	2026-10-04 19:48:00.980397
7a1b3ef0-14cf-47f5-9d79-44847fc00ae7	1e35a661-841d-4ca3-8d49-b6137ddaef63	29AAABM5678N1ZS	Mphasis Limited	Bagmane WTC, Bangalore 560048	250000.00	0.00	f	\N	\N	2026-10-04 19:48:00.981504	2026-10-04 19:48:00.981504
896aebc6-1586-4814-93b0-6d88d948d81e	0b1403b6-ff2b-4bb2-9154-12f06e74a27d	29AAABH1234N1ZT	Hexaware Technologies	Lalbaug, Mumbai 400012	400000.00	90000.00	t	\N	\N	2026-10-04 19:48:00.982421	2026-10-04 19:48:00.982421
f9155816-0ce5-462e-b8f3-a1ca2bd2869e	32bc9f33-1e62-43fd-9c4d-fb7e823f2ac2	36AABCZ5678N1ZU	Zensar Technologies	EON IT Park, Pune 411014	350000.00	120000.00	t	\N	\N	2026-10-04 19:48:00.983476	2026-10-04 19:48:00.983476
1d57e24f-48e8-4213-99fc-d44fd7e12e64	f6dc2c4e-6b64-4c58-8588-413be7939773	27AABCL9012N1ZV	L&T Infotech	L&T Tech Park, Mumbai 400706	600000.00	0.00	f	\N	\N	2026-10-04 19:48:00.985294	2026-10-04 19:48:00.985294
61a2057c-b62c-4f2e-902a-20586b940832	4a0546de-b16b-4cf3-bc6c-85c214889aea	746463636363636	jfnejfnjenfef	\N	0.00	0.00	f	\N	\N	2026-10-14 10:56:45.074269	2026-10-14 10:56:45.074269
\.


--
-- Data for Name: commissions; Type: TABLE DATA; Schema: public; Owner: dbugg
--

COPY public.commissions (id, "dealerId", "orderId", "saleAmount", "commissionRate", "commissionAmount", "tdsAmount", "netAmount", status, "payoutId", "createdAt") FROM stdin;
01536506-a48b-4010-990b-32691b82e0f3	09945c2f-bcd2-4655-a686-3e763f8d51e3	52077d92-f55a-4737-8ce4-c7c7159210c9	45000.00	8.00	3600.00	360.00	3240.00	paid	\N	2026-10-04 19:48:01.005344
0ce83a27-431b-4d3a-8f35-da0694b1fc9f	3648e61c-7184-4719-87e6-c8bb32967b1e	d549b6b0-306f-488d-9f20-76cbae90633e	53000.00	8.00	4240.00	424.00	3816.00	paid	\N	2026-10-01 19:48:01.008394
7dd3aee8-38ac-44ae-8c8f-7da34f02bc40	40a38075-60b4-47ce-ba1e-a85fb72999d7	27462eac-e5aa-4f75-b089-e1b0746815fd	61000.00	8.00	4880.00	488.00	4392.00	paid	\N	2026-09-28 19:48:01.009803
3b7e31b5-10a8-4437-b744-185b50c3aeb1	628830e5-47e8-4a0b-8a27-7f58d273bd6d	60a0bc8d-f743-4e03-b564-0dacc4e3c329	69000.00	8.00	5520.00	552.00	4968.00	pending	\N	2026-09-25 19:48:01.011784
baec54e8-52e7-418d-9d57-fb61a9454792	06d88697-8522-4f3e-9e8a-d57bbfcb894e	7ff017c4-d26b-4f0d-bc00-46c2690b78d7	77000.00	8.00	6160.00	616.00	5544.00	pending	\N	2026-09-22 19:48:01.013007
fa079f4c-0e51-4934-99e4-b36e9fd0abd2	2b8b5950-9d5c-4bd8-a2bd-d10d071a526c	596f7cad-ba1d-4749-9290-3fadfa0c356b	85000.00	8.00	6800.00	680.00	6120.00	paid	\N	2026-09-19 19:48:01.014453
f21883b2-b377-425e-89fe-457d2f868c2f	47d6efa9-7c4d-4592-8c62-6da7b2a6ba4a	3ba495dd-3687-4f12-878f-5ae1b9e3935a	93000.00	8.00	7440.00	744.00	6696.00	pending	\N	2026-09-16 19:48:01.015603
81942053-51dd-4629-8075-3a62c34aa7a1	984bd717-6417-4e1a-b61b-598c1f907fd6	c611b4e1-9b57-4de2-a606-0ca0991da784	101000.00	8.00	8080.00	808.00	7272.00	paid	\N	2026-09-13 19:48:01.016768
105bf4c9-dc68-4765-8ec2-b5b367cbeca1	580d2448-b1e2-4f54-84dd-705154eb5985	9679b3d0-28cb-44c3-99ae-5f46f0e66415	109000.00	8.00	8720.00	872.00	7848.00	pending	\N	2026-09-10 19:48:01.017992
39134e87-608b-49a7-98ae-53463ca48e31	58e0d9d6-24fe-4718-be83-fadf63ebcad1	3a62aef9-4986-4a3c-a333-28ba3ab38431	117000.00	8.00	9360.00	936.00	8424.00	paid	\N	2026-09-07 19:48:01.019917
\.


--
-- Data for Name: dealers; Type: TABLE DATA; Schema: public; Owner: dbugg
--

COPY public.dealers (id, "userId", gstin, "companyName", "bankDetails", tier, territory, "agreementUrl", status, "commissionRate", "walletBalance", "approvedBy", "createdAt", "updatedAt") FROM stdin;
09945c2f-bcd2-4655-a686-3e763f8d51e3	f184fdd1-43a4-45cd-a9c3-d8707f74c934	27AABCU9603R1ZX	Vikram Electronics Pvt Ltd	{"bank":"HDFC Bank","account":"50142246459","ifsc":"HDFC0001234"}	gold	Maharashtra	\N	active	8.00	42000.00	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-04 19:48:00.987093	2026-10-04 19:48:00.987093
3648e61c-7184-4719-87e6-c8bb32967b1e	af1cd44f-a025-4ee8-aea7-e65fcb3183cf	29AABCS1429B1ZX	Spectrum Laptop World	{"bank":"HDFC Bank","account":"50145065235","ifsc":"HDFC0001234"}	silver	Karnataka	\N	active	6.00	18500.00	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-04 19:48:00.989259	2026-10-04 19:48:00.989259
628830e5-47e8-4a0b-8a27-7f58d273bd6d	d880b723-40a6-4826-bbb1-29ea21fc4d9a	24AABCD1234N1ZR	DigiCart Store	{"bank":"HDFC Bank","account":"50146928653","ifsc":"HDFC0001234"}	silver	Gujarat	\N	active	6.00	9800.00	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-04 19:48:00.992597	2026-10-04 19:48:00.992597
06d88697-8522-4f3e-9e8a-d57bbfcb894e	66137282-07fc-422d-a6b0-a3512d80f840	33AABCT1234N1ZS	TechWorld India	{"bank":"HDFC Bank","account":"50142885561","ifsc":"HDFC0001234"}	gold	Tamil Nadu	\N	active	8.00	31200.00	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-04 19:48:00.99431	2026-10-04 19:48:00.99431
47d6efa9-7c4d-4592-8c62-6da7b2a6ba4a	0b1403b6-ff2b-4bb2-9154-12f06e74a27d	19AABCK1234N1ZU	Kolkata PC Zone	{"bank":"HDFC Bank","account":"50148531860","ifsc":"HDFC0001234"}	silver	West Bengal	\N	active	6.00	7600.00	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-04 19:48:00.998357	2026-10-04 19:48:00.998357
984bd717-6417-4e1a-b61b-598c1f907fd6	32bc9f33-1e62-43fd-9c4d-fb7e823f2ac2	36AABCH5678N1ZV	Hyderabad IT Mart	{"bank":"HDFC Bank","account":"50148644709","ifsc":"HDFC0001234"}	gold	Telangana	\N	active	8.00	22400.00	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-04 19:48:00.99943	2026-10-04 19:48:00.99943
580d2448-b1e2-4f54-84dd-705154eb5985	f6dc2c4e-6b64-4c58-8588-413be7939773	03AABCP1234N1ZW	Punjab Tech Solutions	{"bank":"HDFC Bank","account":"50143751850","ifsc":"HDFC0001234"}	platinum	Punjab	\N	active	10.00	67800.00	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-04 19:48:01.000886	2026-10-04 19:48:01.000886
40a38075-60b4-47ce-ba1e-a85fb72999d7	3f4b3a76-16ca-43ae-8fa8-8ea6a77f0a1d	07AABCN4321M1ZQ	NextGen Computers	{"bank":"HDFC Bank","account":"50143137384","ifsc":"HDFC0001234"}	silver	Delhi NCR	\N	active	6.00	0.00	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-04 19:48:00.991402	2026-10-09 22:38:05.054866
2b8b5950-9d5c-4bd8-a2bd-d10d071a526c	1e35a661-841d-4ca3-8d49-b6137ddaef63	08AABCJ1234N1ZT	Jaipur Laptop Hub	{"bank":"HDFC Bank","account":"50143121476","ifsc":"HDFC0001234"}	silver	Rajasthan	\N	active	6.00	0.00	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-04 19:48:00.996938	2026-10-15 11:43:53.65301
58e0d9d6-24fe-4718-be83-fadf63ebcad1	0b7980b7-cc0f-4ca5-925d-54169c846e47	21AABCO1234N1ZX	Odisha Computer Systems	{"bank":"HDFC Bank","account":"50143554646","ifsc":"HDFC0001234"}	silver	Odisha	\N	active	6.00	0.00	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-04 19:48:01.002852	2026-10-15 11:43:54.962766
\.


--
-- Data for Name: kyc_documents; Type: TABLE DATA; Schema: public; Owner: dbugg
--

COPY public.kyc_documents (id, "userId", type, "docUrlEncrypted", "selfieUrl", "faceMatchScore", "maskedId", status, "rejectionReason", "reviewedBy", "createdAt") FROM stdin;
f61593e6-7a5d-4015-ab1d-d68d7baf040b	1e35a661-841d-4ca3-8d49-b6137ddaef63	aadhaar	https://s3.ap-south-1.amazonaws.com/dbuggs-kyc/1e35a661-841d-4ca3-8d49-b6137ddaef63/aadhaar.pdf	\N	\N	\N	approved	\N	\N	2026-10-04 19:48:01.02144
e75e8585-5fab-4d2f-af60-a6d7c740b3cc	1e35a661-841d-4ca3-8d49-b6137ddaef63	pan	https://s3.ap-south-1.amazonaws.com/dbuggs-kyc/1e35a661-841d-4ca3-8d49-b6137ddaef63/pan.pdf	\N	\N	\N	approved	\N	\N	2026-10-04 19:48:01.023125
9d6b2c1c-603e-4cdb-8e34-298f4985e62c	0b1403b6-ff2b-4bb2-9154-12f06e74a27d	aadhaar	https://s3.ap-south-1.amazonaws.com/dbuggs-kyc/0b1403b6-ff2b-4bb2-9154-12f06e74a27d/aadhaar.pdf	\N	\N	\N	approved	\N	\N	2026-10-04 19:48:01.025551
7aed3178-adf6-4b64-abc6-7ed9a7617692	5b57b5e6-b787-4fc7-96e0-06c1306fc1d7	gstin	https://s3.ap-south-1.amazonaws.com/dbuggs-kyc/5b57b5e6-b787-4fc7-96e0-06c1306fc1d7/gstin.pdf	\N	\N	\N	approved	\N	\N	2026-10-04 19:48:01.030204
99a3ccc3-a7c3-4442-84a4-0443d6165d4c	9bb6a6bd-0325-4c3e-8140-99b551300a39	gstin	https://s3.ap-south-1.amazonaws.com/dbuggs-kyc/9bb6a6bd-0325-4c3e-8140-99b551300a39/gstin.pdf	\N	\N	\N	approved	\N	\N	2026-10-04 19:48:01.031217
d58d2190-e8ff-481e-8090-de92323c9db7	f184fdd1-43a4-45cd-a9c3-d8707f74c934	aadhaar	https://s3.ap-south-1.amazonaws.com/dbuggs-kyc/f184fdd1-43a4-45cd-a9c3-d8707f74c934/aadhaar.pdf	\N	\N	\N	approved	\N	\N	2026-10-04 19:48:01.033658
b9549283-1cd3-42ba-98cc-1d4635becb90	f184fdd1-43a4-45cd-a9c3-d8707f74c934	pan	https://s3.ap-south-1.amazonaws.com/dbuggs-kyc/f184fdd1-43a4-45cd-a9c3-d8707f74c934/pan.pdf	\N	\N	\N	approved	\N	\N	2026-10-04 19:48:01.035195
ae4c13d1-50c2-493d-b49e-8e27d4bef25d	0b1403b6-ff2b-4bb2-9154-12f06e74a27d	pan	https://s3.ap-south-1.amazonaws.com/dbuggs-kyc/0b1403b6-ff2b-4bb2-9154-12f06e74a27d/pan.pdf	\N	\N	\N	approved	\N	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-04 19:48:01.027371
7eac9449-1647-4cc5-83f1-c816407074c5	32bc9f33-1e62-43fd-9c4d-fb7e823f2ac2	aadhaar	https://s3.ap-south-1.amazonaws.com/dbuggs-kyc/32bc9f33-1e62-43fd-9c4d-fb7e823f2ac2/aadhaar.pdf	\N	\N	\N	approved	\N	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-04 19:48:01.028795
e900b779-f497-4f38-8173-275f214b8c4a	478ca155-481e-4e40-a981-9fe4db69ceda	gstin	https://s3.ap-south-1.amazonaws.com/dbuggs-kyc/478ca155-481e-4e40-a981-9fe4db69ceda/gstin.pdf	\N	\N	\N	approved	\N	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-04 19:48:01.032101
a994d484-f339-48ed-ae8f-5fae4fed9ba9	cd816567-0336-43da-82e8-5594cf4628c7	aadhaar	uploaded-from-checkout	\N	\N	\N	approved	\N	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-16 13:58:08.415716
06468ecb-7287-43ad-ad12-50663717e18a	cd816567-0336-43da-82e8-5594cf4628c7	pan	uploaded-from-checkout	\N	\N	\N	approved	\N	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-16 13:58:08.415716
92deb9f6-14d6-461d-9fe8-90624551d9df	ff4f3ed5-3dcd-46fb-887a-da7d46656cef	pan	pan-uploaded	\N	\N	AB****GH	approved	\N	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-16 23:05:08.692068
079d12c2-41b7-4d6c-8daa-6caaa07704e7	ff4f3ed5-3dcd-46fb-887a-da7d46656cef	aadhaar	pending-review	selfie-uploaded	\N	XXXX XXXX 1234	approved	\N	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-16 22:51:43.266047
766f47ba-e7fc-47bd-ba1d-836d0da1bfd1	cd816567-0336-43da-82e8-5594cf4628c7	aadhaar	test-aadhaar-doc	\N	\N	XXXX XXXX 4523	approved	\N	826b0907-2cea-4cd8-a2bc-2089649d94fa	2026-10-16 21:45:56.62667
\.


--
-- Data for Name: laptop_qc; Type: TABLE DATA; Schema: public; Owner: dbugg
--

COPY public.laptop_qc (id, "laptopId", "technicianId", checklist, "batteryPercent", photos, "reportPdfUrl", "partsReplaced", "adminNotes", "gradedAs", "createdAt") FROM stdin;
\.


--
-- Data for Name: laptops; Type: TABLE DATA; Schema: public; Owner: dbugg
--

COPY public.laptops (id, "serialNo", brand, model, processor, ram, storage, display, grade, status, "warehouseId", "sellingPrice", "rentalPrice", "dealerPrice", "wholesalePrice", "warrantyMonths", "createdAt", "updatedAt") FROM stdin;
52f9d67a-97da-48dc-8b10-7662ac514a4f	SN2026004	Lenovo	ThinkPad X1 Carbon G10	Intel Core i7-1265U	16GB LPDDR5	512GB SSD	14" 2K IPS Anti-glare	A	available	WH-DEL-01	74999.00	3799.00	65000.00	60000.00	12	2026-09-25 19:46:35.408315	2026-10-04 19:46:35.408315
b683bae6-364a-4f91-a720-0867bbeff6d8	SN2026007	HP	Pavilion 15-eg2076TU	Intel Core i5-1235G7	8GB DDR4	512GB HDD+256SSD	15.6" FHD IPS	B	available	WH-HYD-01	32999.00	1799.00	28000.00	25000.00	6	2026-09-16 19:46:35.41185	2026-10-04 19:46:35.41185
3f169f1a-2d30-4148-ad2a-76a5c21e90aa	SN2026008	Lenovo	IdeaPad Slim 5 Pro	AMD Ryzen 5 5500U	8GB DDR4	512GB SSD	15.6" FHD TN	B	available	WH-DEL-01	28999.00	1499.00	24000.00	21000.00	6	2026-09-13 19:46:35.413543	2026-10-04 19:46:35.413543
16d90ca1-71f5-489e-93a1-c68b1f3ec072	SN2026009	Acer	Swift 3 SF314-43	AMD Ryzen 5 5500U	8GB	512GB SSD	14" FHD IPS	B	available	WH-BLR-01	35999.00	1899.00	31000.00	28000.00	6	2026-09-10 19:46:35.414646	2026-10-04 19:46:35.414646
abf2001b-5be9-4e84-8ce5-79d87145a87e	SN2026010	Dell	Inspiron 15 3511	Intel Core i3-1115G4	8GB DDR4	256GB SSD	15.6" HD TN	C	available	WH-DEL-01	21999.00	999.00	18000.00	16000.00	3	2026-09-07 19:46:35.415678	2026-10-04 19:46:35.415678
8417e21a-b7ab-49c2-a053-75f0d45aefe1	SN2026011	Dell	Latitude 5520	Intel Core i5-1145G7	8GB DDR4	256GB NVMe SSD	15.6" FHD Anti-glare	A	rented	WH-HYD-01	48999.00	2299.00	42000.00	38000.00	12	2026-09-04 19:46:35.416716	2026-10-04 19:46:35.416716
f14a0a5d-ee95-4007-ba47-2d95b44525ca	SN2026012	HP	ProBook 450 G8	Intel Core i7-1165G7	16GB DDR4	512GB SSD	15.6" FHD IPS	A	rented	WH-MUM-01	55999.00	2799.00	48000.00	43000.00	12	2026-09-01 19:46:35.417703	2026-10-04 19:46:35.417703
e1a2f211-9cf6-46cb-9f5d-1f4b81a6f41a	SN2026015	Asus	VivoBook 15 X513EA	Intel Core i3-1115G4	4GB DDR4	256GB SSD	15.6" FHD	C	available	WH-HYD-01	18999.00	899.00	15000.00	13000.00	3	2026-08-23 19:46:35.420455	2026-10-04 19:46:35.420455
12d636c1-c220-4586-bac8-3740e77ede64	SN2026002	Apple	MacBook Pro M2 14"	Apple M2 Pro 10-core	16GB LPDDR5	512GB SSD	14.2" Liquid Retina XDR	A+	reserved	WH-MUM-01	129999.00	6499.00	115000.00	108000.00	12	2026-10-01 19:46:35.406048	2026-10-04 20:02:44.268604
b00db3b7-bfc5-40d9-9211-6021ebd4d0f6	SN2026003	HP	EliteBook 840 G9	Intel Core i5-1235U	8GB DDR4	256GB NVMe SSD	14" FHD IPS Anti-glare	A	reserved	WH-HYD-01	52999.00	2799.00	46000.00	42000.00	12	2026-09-28 19:46:35.407206	2026-10-04 20:02:44.452448
a35800c7-edd5-4b07-8bf8-4e002c0e5c02	SN2026001	Dell	XPS 15 9510	Intel Core i7-11800H	16GB DDR5	512GB NVMe SSD	15.6" 4K OLED Touch	A+	reserved	WH-HYD-01	89999.00	4499.00	78000.00	72000.00	12	2026-10-04 19:46:35.403894	2026-10-04 20:21:30.794081
0b15aed4-698d-498a-ab83-0606fbccceb3	SN2026014	Lenovo	ThinkPad E14 Gen 4	AMD Ryzen 5 6600U	16GB DDR4	512GB SSD	14" FHD IPS	A+	reserved	WH-DEL-01	47999.00	2399.00	41000.00	37000.00	12	2026-08-26 19:46:35.419526	2026-10-04 22:08:33.017804
fad75a1f-741d-41f1-a7ba-536c01d1b614	SN2026013	Apple	MacBook Air M1 2020	Apple M1 8-core	8GB	256GB SSD	13.3" Retina IPS	A+	reserved	WH-BLR-01	78999.00	3999.00	68000.00	62000.00	12	2026-08-29 19:46:35.418641	2026-10-04 22:59:09.609191
5400d69d-bebd-4ec4-88e9-920d77391aa9	SN2026005	Asus	ZenBook 14 OLED	AMD Ryzen 7 5800U	16GB DDR4	512GB NVMe SSD	14" FHD OLED	A	reserved	WH-BLR-01	61999.00	3199.00	54000.00	49000.00	12	2026-09-22 19:46:35.409263	2026-10-14 10:49:20.825875
5f05a76e-b656-49de-a4e8-27b867d5c5bf	SN2026006	Microsoft	Surface Laptop 5	Intel Core i5-1235U	8GB LPDDR5	256GB SSD	13.5" PixelSense Touch	A	reserved	WH-MUM-01	68999.00	3499.00	60000.00	55000.00	12	2026-09-19 19:46:35.410529	2026-10-14 11:01:12.586087
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: dbugg
--

COPY public.orders (id, "orderNumber", "userId", "laptopId", type, status, amount, "gstAmount", "gstInvoiceUrl", "shipmentId", "trackingId", "shippingAddress", "paymentId", "createdAt", "updatedAt") FROM stdin;
3a62aef9-4986-4a3c-a333-28ba3ab38431	ORD-2026001	1e35a661-841d-4ca3-8d49-b6137ddaef63	a35800c7-edd5-4b07-8bf8-4e002c0e5c02	b2c	delivered	89999.00	16200.00	\N	\N	\N	42 MG Road, Hyderabad 500001	\N	2026-10-04 19:46:35.422065	2026-10-04 19:46:35.422065
9679b3d0-28cb-44c3-99ae-5f46f0e66415	ORD-2026002	0b1403b6-ff2b-4bb2-9154-12f06e74a27d	12d636c1-c220-4586-bac8-3740e77ede64	b2c	shipped	129999.00	23400.00	\N	\N	\N	15 FC Road, Pune 411005	\N	2026-10-02 19:46:35.42317	2026-10-04 19:46:35.42317
c611b4e1-9b57-4de2-a606-0ca0991da784	ORD-2026003	32bc9f33-1e62-43fd-9c4d-fb7e823f2ac2	b00db3b7-bfc5-40d9-9211-6021ebd4d0f6	b2c	processing	52999.00	9540.00	\N	\N	\N	7 Park Street, Kolkata 700016	\N	2026-09-30 19:46:35.424177	2026-10-04 19:46:35.424177
3ba495dd-3687-4f12-878f-5ae1b9e3935a	ORD-2026004	f6dc2c4e-6b64-4c58-8588-413be7939773	52f9d67a-97da-48dc-8b10-7662ac514a4f	b2c	confirmed	74999.00	13500.00	\N	\N	\N	88 Residency Road, Bangalore 560025	\N	2026-09-28 19:46:35.425111	2026-10-04 19:46:35.425111
596f7cad-ba1d-4749-9290-3fadfa0c356b	ORD-2026005	0b7980b7-cc0f-4ca5-925d-54169c846e47	5400d69d-bebd-4ec4-88e9-920d77391aa9	b2c	pending	61999.00	11160.00	\N	\N	\N	22 Linking Road, Mumbai 400050	\N	2026-09-26 19:46:35.426023	2026-10-04 19:46:35.426023
7ff017c4-d26b-4f0d-bc00-46c2690b78d7	ORD-2026006	5b57b5e6-b787-4fc7-96e0-06c1306fc1d7	5f05a76e-b656-49de-a4e8-27b867d5c5bf	b2b	delivered	275000.00	49500.00	\N	\N	\N	Cyber Towers, Hitech City, Hyderabad 500081	\N	2026-09-24 19:46:35.426889	2026-10-04 19:46:35.426889
60a0bc8d-f743-4e03-b564-0dacc4e3c329	ORD-2026007	9bb6a6bd-0325-4c3e-8140-99b551300a39	b683bae6-364a-4f91-a720-0867bbeff6d8	b2b	confirmed	200000.00	36000.00	\N	\N	\N	Electronics City Phase 1, Bangalore 560100	\N	2026-09-22 19:46:35.427786	2026-10-04 19:46:35.427786
27462eac-e5aa-4f75-b089-e1b0746815fd	ORD-2026008	478ca155-481e-4e40-a981-9fe4db69ceda	3f169f1a-2d30-4148-ad2a-76a5c21e90aa	b2b	processing	63000.00	11340.00	\N	\N	\N	Whitefield, Bangalore 560066	\N	2026-09-20 19:46:35.428522	2026-10-04 19:46:35.428522
d549b6b0-306f-488d-9f20-76cbae90633e	ORD-2026009	f139bc6d-d5ff-4d84-8168-b74fbe51fc27	16d90ca1-71f5-489e-93a1-c68b1f3ec072	b2b	shipped	280000.00	50400.00	\N	\N	\N	Sector 126, Noida 201301	\N	2026-09-18 19:46:35.429273	2026-10-04 19:46:35.429273
52077d92-f55a-4737-8ce4-c7c7159210c9	ORD-2026010	1e35a661-841d-4ca3-8d49-b6137ddaef63	a35800c7-edd5-4b07-8bf8-4e002c0e5c02	b2c	return_requested	89999.00	16200.00	\N	\N	\N	42 MG Road, Hyderabad 500001	\N	2026-09-16 19:46:35.430032	2026-10-04 19:46:35.430032
05f6e5a4-2070-4733-b74a-947bc3da6f52	ORD-1791144164263	f184fdd1-43a4-45cd-a9c3-d8707f74c934	12d636c1-c220-4586-bac8-3740e77ede64	b2c	pending	129999.00	\N	\N	\N	\N	fedgfdf	\N	2026-10-04 20:02:44.275013	2026-10-04 20:02:44.275013
25b8816d-1d3b-41f2-9bb0-6c12641ddb8c	ORD-1791144164451	f184fdd1-43a4-45cd-a9c3-d8707f74c934	b00db3b7-bfc5-40d9-9211-6021ebd4d0f6	b2c	pending	52999.00	\N	\N	\N	\N	fedgfdf	\N	2026-10-04 20:02:44.454796	2026-10-04 20:02:44.454796
a647260c-b172-4c40-8da5-9982a76dae51	ORD-1791151713016	1e35a661-841d-4ca3-8d49-b6137ddaef63	0b15aed4-698d-498a-ab83-0606fbccceb3	b2c	pending	47999.00	\N	\N	\N	\N	Avika Technology, 8877224160 | 45, egfrrgrerf, hapura, Jharkhand - 824120	\N	2026-10-04 22:08:33.02179	2026-10-04 22:08:33.02179
0669b2d0-b6e9-4e3a-a129-f25445619bd2	ORD-1791154749608	cd816567-0336-43da-82e8-5594cf4628c7	fad75a1f-741d-41f1-a7ba-536c01d1b614	b2c	delivered	78999.00	\N	\N	\N	\N	avinash singh, 8877224160 | Shridhar university, rahasthan, rajasthan, Rajasthan - 333026	\N	2026-10-04 22:59:09.611586	2026-10-14 10:48:21.742815
9a7f0b99-b8d8-4f70-9890-f80f638e1143	ORD-1791974960817	cd816567-0336-43da-82e8-5594cf4628c7	5400d69d-bebd-4ec4-88e9-920d77391aa9	b2c	shipped	61999.00	\N	\N	\N	\N	Avinash Singh, 8877224160 | fhdsbjdb, Haspura choti field, Haspura, Jharkhand - 824120	\N	2026-10-14 10:49:20.831166	2026-10-14 10:50:27.320708
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: dbugg
--

COPY public.payments (id, "entityId", "entityType", "razorpayOrderId", "razorpayPaymentId", amount, currency, status, method, "refundId", "createdAt") FROM stdin;
\.


--
-- Data for Name: rentals; Type: TABLE DATA; Schema: public; Owner: dbugg
--

COPY public.rentals (id, "userId", "laptopId", "monthlyRent", "depositAmount", "autopayId", "agreementUrl", status, "startDate", "nextDueDate", "lateFee", "returnDate", "depositRefund", "createdAt", "updatedAt", tenure, "panNumber", "mobileVerified", "monthlyIncome", "employmentType", "creditScore", "creditStatus", "totalPayable", "processingFee", "rejectionReason", "approvedBy", "approvedAt", "emiSchedule") FROM stdin;
3f653f0d-8281-471b-9134-0ea0215097e4	1e35a661-841d-4ca3-8d49-b6137ddaef63	f14a0a5d-ee95-4007-ba47-2d95b44525ca	2799.00	8397.00	\N	\N	active	2026-07-01 00:00:00	2026-11-01 00:00:00	0.00	\N	\N	2026-10-04 19:48:00.914492	2026-10-04 19:48:00.914492	6	\N	f	\N	\N	\N	pending	\N	0.00	\N	\N	\N	\N
89c43fd9-cdaa-4d8d-88db-ed13491a0fe6	0b1403b6-ff2b-4bb2-9154-12f06e74a27d	8417e21a-b7ab-49c2-a053-75f0d45aefe1	2299.00	6897.00	\N	\N	active	2026-07-01 00:00:00	2026-11-01 00:00:00	0.00	\N	\N	2026-09-24 19:48:00.922755	2026-10-04 19:48:00.922755	6	\N	f	\N	\N	\N	pending	\N	0.00	\N	\N	\N	\N
14cbb247-9fde-4f3e-a13d-4b81ba286e10	32bc9f33-1e62-43fd-9c4d-fb7e823f2ac2	16d90ca1-71f5-489e-93a1-c68b1f3ec072	1899.00	5697.00	\N	\N	active	2026-07-01 00:00:00	2026-11-01 00:00:00	0.00	\N	\N	2026-09-14 19:48:00.92895	2026-10-04 19:48:00.92895	6	\N	f	\N	\N	\N	pending	\N	0.00	\N	\N	\N	\N
f852ef17-91f6-44da-81be-84654d2da7a8	f6dc2c4e-6b64-4c58-8588-413be7939773	3f169f1a-2d30-4148-ad2a-76a5c21e90aa	1499.00	4497.00	\N	\N	active	2026-07-01 00:00:00	2026-11-01 00:00:00	0.00	\N	\N	2026-09-04 19:48:00.933043	2026-10-04 19:48:00.933043	6	\N	f	\N	\N	\N	pending	\N	0.00	\N	\N	\N	\N
22013974-167f-4e33-9b24-139dfe722e96	0b7980b7-cc0f-4ca5-925d-54169c846e47	b683bae6-364a-4f91-a720-0867bbeff6d8	1799.00	5397.00	\N	\N	active	2026-07-01 00:00:00	2026-11-01 00:00:00	0.00	\N	\N	2026-08-25 19:48:00.938799	2026-10-04 19:48:00.938799	6	\N	f	\N	\N	\N	pending	\N	0.00	\N	\N	\N	\N
7d9daf56-08e5-4924-b8f6-9cb4ee602876	1e35a661-841d-4ca3-8d49-b6137ddaef63	5f05a76e-b656-49de-a4e8-27b867d5c5bf	3499.00	10497.00	\N	\N	kyc_pending	2026-07-01 00:00:00	2026-11-01 00:00:00	0.00	\N	\N	2026-08-15 19:48:00.943664	2026-10-04 19:48:00.943664	6	\N	f	\N	\N	\N	pending	\N	0.00	\N	\N	\N	\N
813581c4-c4b9-4e09-902c-0d09dff87d43	0b1403b6-ff2b-4bb2-9154-12f06e74a27d	5400d69d-bebd-4ec4-88e9-920d77391aa9	3199.00	9597.00	\N	\N	deposit_pending	2026-07-01 00:00:00	2026-11-01 00:00:00	0.00	\N	\N	2026-08-05 19:48:00.950285	2026-10-04 19:48:00.950285	6	\N	f	\N	\N	\N	pending	\N	0.00	\N	\N	\N	\N
1f4e7f18-22bd-4af9-8689-b8f8ef8d6ab7	32bc9f33-1e62-43fd-9c4d-fb7e823f2ac2	52f9d67a-97da-48dc-8b10-7662ac514a4f	3799.00	11397.00	\N	\N	overdue	2026-07-01 00:00:00	2026-11-01 00:00:00	0.00	\N	\N	2026-07-26 19:48:00.955967	2026-10-04 19:48:00.955967	6	\N	f	\N	\N	\N	pending	\N	0.00	\N	\N	\N	\N
57c9bffe-77a5-45e7-9e9b-39997ac86f03	f6dc2c4e-6b64-4c58-8588-413be7939773	b00db3b7-bfc5-40d9-9211-6021ebd4d0f6	2799.00	8397.00	\N	\N	closed	2026-07-01 00:00:00	2026-11-01 00:00:00	0.00	\N	\N	2026-07-16 19:48:00.963125	2026-10-04 19:48:00.963125	6	\N	f	\N	\N	\N	pending	\N	0.00	\N	\N	\N	\N
a99f5f16-5f20-4909-bc91-7556ac682060	0b7980b7-cc0f-4ca5-925d-54169c846e47	12d636c1-c220-4586-bac8-3740e77ede64	6499.00	19497.00	\N	\N	active	2026-07-01 00:00:00	2026-11-01 00:00:00	0.00	\N	\N	2026-07-06 19:48:00.968081	2026-10-04 19:48:00.968081	6	\N	f	\N	\N	\N	pending	\N	0.00	\N	\N	\N	\N
bb6c37ae-bc84-475d-85a0-1727ba818395	cd816567-0336-43da-82e8-5594cf4628c7	52f9d67a-97da-48dc-8b10-7662ac514a4f	3750.00	15000.00	\N	\N	deposit_pending	\N	\N	0.00	\N	\N	2026-10-16 12:25:42.893027	2026-10-16 12:25:42.893027	6	\N	f	\N	\N	\N	pending	\N	0.00	\N	\N	\N	\N
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: dbugg
--

COPY public.role_permissions (id, role, page, "canView", "canCreate", "canEdit", "canDelete", "updatedAt") FROM stdin;
1d0fce27-5c30-412d-9a4c-221b1cd6f700	admin	dashboard	t	f	f	f	2026-10-15 11:46:22.931775
bcd6ad90-d282-4717-8d26-faceb833ebc4	admin	inventory	t	f	f	f	2026-10-15 11:46:22.964089
13a10549-f5c1-4bd3-b857-bb82d4ac48d5	admin	qc-grading	t	f	f	f	2026-10-15 11:46:22.969158
5b3102b3-f5cd-46f7-bb5d-c76fd43df8e9	admin	b2c-orders	t	f	f	f	2026-10-15 11:46:22.972831
ff1a9c1e-0eef-4581-84e3-e817a41815f3	admin	returns	t	f	f	f	2026-10-15 11:46:22.977909
3ec053b7-7be2-4dfe-8005-3cb49d80d943	admin	b2b-approvals	t	f	f	f	2026-10-15 11:46:22.987614
4c309279-64d7-4074-92ea-600a10b330e0	admin	quotations	t	f	f	f	2026-10-15 11:46:22.994887
e8a0fc1b-3c7d-4707-8d1f-4310968e301f	admin	kyc-queue	t	f	f	f	2026-10-15 11:46:23.008225
39f2d048-0d9a-4400-a070-289e9e1c5b1d	admin	rentals	t	f	f	f	2026-10-15 11:46:23.016405
42bc7b35-e0b1-4baa-9501-50f8da1fa1a2	admin	dealer-applications	t	f	f	f	2026-10-15 11:46:23.02344
ac2d8b71-3328-42b5-8e56-6b165cc8c2c1	admin	dealers-tiers	t	f	f	f	2026-10-15 11:46:23.033261
4c561dcc-732b-4a51-a67e-2e0d2cb4ac6c	admin	commission	t	f	f	f	2026-10-15 11:46:23.039439
42ab0681-09ec-46c5-9a8e-7e731dcf14ae	admin	warranty	t	f	f	f	2026-10-15 11:46:23.04254
50675fae-8d4b-452b-ad38-6ae5b8c6d5d8	admin	marketing	t	f	f	f	2026-10-15 11:46:23.045535
e559e8d9-6bd4-41bd-a322-97a53bee855c	admin	finance	t	f	f	f	2026-10-15 11:46:23.050746
48c7a248-d848-4ff3-a68d-c4175195e02a	admin	reports	t	f	f	f	2026-10-15 11:46:23.056275
362c85fd-7940-437f-8611-57909628a904	admin	pricing-rules	t	f	f	f	2026-10-15 11:46:23.063678
530fe04f-110c-4e22-a1fb-3348381fdc9e	admin	admins-roles	t	f	f	f	2026-10-15 11:46:23.068027
3c900b70-05ca-43df-a39f-337ca5b4020e	admin	integrations	t	f	f	f	2026-10-15 11:46:23.080737
a064cbda-e27a-479f-9b4e-ff0ea702ac3e	admin	audit-log	t	f	f	f	2026-10-15 11:46:23.086756
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: dbugg
--

COPY public.users (id, name, phone, email, password, role, "kycStatus", "fcmToken", "isActive", "createdAt", "updatedAt") FROM stdin;
f139bc6d-d5ff-4d84-8168-b74fbe51fc27	HCL Technologies	+919663333333	hcl@corp.in	$2a$10$nhf.mz0TN9iQnk0kWgU8puehQZ7nQMjs2/31T14K9jxP7Y/SU2JQS	b2b	approved	\N	t	2026-10-04 19:46:34.9368	2026-10-04 19:46:34.9368
8e6876ad-309c-43f2-8936-283337c8e8fb	Tata Consultancy	+919662222222	tcs@corp.in	$2a$10$CZFwPvdRfu4jMmw3KACs4Oc9cmuLeOdPpEwC5l1UyUk0s/SgZqm1G	b2b	approved	\N	t	2026-10-04 19:46:35.013243	2026-10-04 19:46:35.013243
f184fdd1-43a4-45cd-a9c3-d8707f74c934	Vikram Electronics	+919555555555	dealer@dbuggs.in	$2a$10$8LZS9kMAUeulQ3ikSFpK/.XVzXMnXxyiN4Abzk5iLZXHOBQYLnn1S	dealer	approved	\N	t	2026-10-04 19:46:35.091425	2026-10-04 19:46:35.091425
af1cd44f-a025-4ee8-aea7-e65fcb3183cf	Spectrum Laptops	+919554444444	spectrum@dealer.in	$2a$10$a7fi75auQzX0VGypkKEx3uj8KYiHU0G.S2DYZM5YNHNeEhtHZQvoa	dealer	approved	\N	t	2026-10-04 19:46:35.170327	2026-10-04 19:46:35.170327
3f4b3a76-16ca-43ae-8fa8-8ea6a77f0a1d	NextGen Computers	+919553333333	nextgen@dealer.in	$2a$10$pGXaXPVcZqA.BCOeEOkx7euWbXKrL0vLVAjUsHY/mtkVKQ/3i1JX.	dealer	pending	\N	t	2026-10-04 19:46:35.249371	2026-10-04 19:46:35.249371
d880b723-40a6-4826-bbb1-29ea21fc4d9a	DigiCart Store	+919552222222	digicart@dealer.in	$2a$10$x/b/fe2ei7Gy9h8RURKIC.lhMmPaKFWya3b4YnwZdct9UtNQzjjl2	dealer	approved	\N	t	2026-10-04 19:46:35.326272	2026-10-04 19:46:35.326272
66137282-07fc-422d-a6b0-a3512d80f840	TechWorld India	+919551111111	techworld@dealer.in	$2a$10$McLpdw31MsylGBIhk/7mvO66mdf5xvVleyROd47vodffhAwfIKx2m	dealer	approved	\N	t	2026-10-04 19:46:35.401582	2026-10-04 19:46:35.401582
b13e9e2e-be84-43e0-9f9b-78a2026cb815	Ops Admin	+919888888888	manageradmin@dbuggs.in	$2a$10$5dNrcT/KMHvPdJ8gSkMzbO4reJjjchjicKFGC68xskOcWBsYzfI0i	admin	approved	\N	t	2026-10-04 19:46:34.23258	2026-10-04 20:28:01.188258
cd816567-0336-43da-82e8-5594cf4628c7	avinash singh	8877224160	avinashsingh36948@gmail.com	$2a$10$jcDUpjtkre9UtMJZb7myF.Bt0iZXBiDal4G5mjWLxOU65MQVnAtZ.	b2c	pending	\N	t	2026-10-04 22:56:10.688904	2026-10-04 22:56:10.688904
4a0546de-b16b-4cf3-bc6c-85c214889aea	Avinash Singh	+18877224160	Avinash@gmail.com	$2a$10$PAklsE6LVTQ7Rgd4y7Qvk.fE/sUhVq0gYWQIi8jRNpk9fDv6uHNFq	b2b	pending	\N	t	2026-10-14 10:56:44.945212	2026-10-14 10:56:44.945212
ff4f3ed5-3dcd-46fb-887a-da7d46656cef	Website Wala	8002633618	websitewala0@gmail.com	$2a$10$IzGhCze6Mds3ygpZYPngdOCaQ33caph4HEph9ughIl6KoYuAK8wBe	b2c	pending	\N	t	2026-10-16 19:23:46.805322	2026-10-16 19:23:46.805322
826b0907-2cea-4cd8-a2bc-2089649d94fa	Super Admin	+919999999999	admin@dbuggs.in	$2a$10$IpcdvhGjyYGsdy8ffz5Bv.6uEZEhVC42eciMH6L0m8kosKbIsDhNq	super_admin	approved	\N	t	2026-10-04 19:46:34.148819	2026-10-04 19:46:34.148819
1e35a661-841d-4ca3-8d49-b6137ddaef63	Rahul Sharma	+919777777777	b2c@dbuggs.in	$2a$10$We0e1b6Q9qF5NlW0bGAbCumNeIP4rIG/J48RaAf0Evi7wocNCDE.6	b2c	approved	\N	t	2026-10-04 19:46:34.309621	2026-10-04 19:46:34.309621
0b1403b6-ff2b-4bb2-9154-12f06e74a27d	Priya Mehta	+919776666666	priya@gmail.com	$2a$10$baYYJU6UpHPXmyVK2XAPsOWyWuApGPogNwBAXSleLpGrC4B6bshCq	b2c	approved	\N	t	2026-10-04 19:46:34.387396	2026-10-04 19:46:34.387396
32bc9f33-1e62-43fd-9c4d-fb7e823f2ac2	Amit Verma	+919775555555	amit@gmail.com	$2a$10$v9VE9nMlik0aQgTYzpoeJeW/VOYbOj6wpKzdJ/TNH7zPK4ndpEziG	b2c	pending	\N	t	2026-10-04 19:46:34.466078	2026-10-04 19:46:34.466078
f6dc2c4e-6b64-4c58-8588-413be7939773	Sneha Rao	+919774444444	sneha@gmail.com	$2a$10$yxkXE0eWQYzKGwO3nCyulOEFg38wo5quvvEXZJn3NMzlMRQASl5Bm	b2c	approved	\N	t	2026-10-04 19:46:34.543168	2026-10-04 19:46:34.543168
0b7980b7-cc0f-4ca5-925d-54169c846e47	Karan Singh	+919773333333	karan@gmail.com	$2a$10$ykNlGgxBvEnuY7lY58UERevrFVZp485RMymDpONfx9rmHCMksTkhS	b2c	approved	\N	t	2026-10-04 19:46:34.619516	2026-10-04 19:46:34.619516
5b57b5e6-b787-4fc7-96e0-06c1306fc1d7	TechCorp Pvt Ltd	+919666666666	b2b@dbuggs.in	$2a$10$n5ofs9fO.Y5oVe8Em64kaO.DDR7/B/nYpZTfGlXpMy3dVvDIZK4aO	b2b	approved	\N	t	2026-10-04 19:46:34.697639	2026-10-04 19:46:34.697639
9bb6a6bd-0325-4c3e-8140-99b551300a39	Infosys Limited	+919665555555	infosys@corp.in	$2a$10$XAHCZeNWKGkPhmcOnbLvaOiWzdsRGSycPRpWt7r4hzt5/z6x4.SCm	b2b	approved	\N	t	2026-10-04 19:46:34.784182	2026-10-04 19:46:34.784182
478ca155-481e-4e40-a981-9fe4db69ceda	Wipro Solutions	+919664444444	wipro@corp.in	$2a$10$tduGrHdaI//h.BQGu3trYexM43Ugv7slsVr8k9ol9k/I07mC0Bzi2	b2b	pending	\N	t	2026-10-04 19:46:34.859949	2026-10-04 19:46:34.859949
\.


--
-- Name: kyc_documents PK_02e49877f1578e6285f84e57ab6; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.kyc_documents
    ADD CONSTRAINT "PK_02e49877f1578e6285f84e57ab6" PRIMARY KEY (id);


--
-- Name: payments PK_197ab7af18c93fbb0c9b28b4a59; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY (id);


--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- Name: commissions PK_2701379966e2e670bb5ff0ae78e; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT "PK_2701379966e2e670bb5ff0ae78e" PRIMARY KEY (id);


--
-- Name: rentals PK_2b10d04c95a8bfe85b506ba52ba; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT "PK_2b10d04c95a8bfe85b506ba52ba" PRIMARY KEY (id);


--
-- Name: laptop_qc PK_39bf04dc48fff05ae1459e510b7; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.laptop_qc
    ADD CONSTRAINT "PK_39bf04dc48fff05ae1459e510b7" PRIMARY KEY (id);


--
-- Name: dealers PK_4d0d8be9eac6e1822ad16d21194; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.dealers
    ADD CONSTRAINT "PK_4d0d8be9eac6e1822ad16d21194" PRIMARY KEY (id);


--
-- Name: orders PK_710e2d4957aa5878dfe94e4ac2f; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY (id);


--
-- Name: role_permissions PK_84059017c90bfcb701b8fa42297; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY (id);


--
-- Name: laptops PK_99d93b23e37ddcbaf86efb6fd36; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.laptops
    ADD CONSTRAINT "PK_99d93b23e37ddcbaf86efb6fd36" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: b2b_buyers PK_e79e25240e780acd39de919180d; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.b2b_buyers
    ADD CONSTRAINT "PK_e79e25240e780acd39de919180d" PRIMARY KEY (id);


--
-- Name: laptops UQ_5c52abb028a0ef13e1b88fcf54b; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.laptops
    ADD CONSTRAINT "UQ_5c52abb028a0ef13e1b88fcf54b" UNIQUE ("serialNo");


--
-- Name: users UQ_a000cca60bcf04454e727699490; Type: CONSTRAINT; Schema: public; Owner: dbugg
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE (phone);


--
-- PostgreSQL database dump complete
--

\unrestrict GU1Cb9VuTL5N6pf9fzxC8UucRJKtOQBayuA7oj7gXpI190FJsZu2j6wEwhOHLhD

