CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'finance',
    'school_ops',
    'customer_service',
    'it_support',
    'citizen'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'finance', 'school_ops', 'customer_service', 'it_support')
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: account_holders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_holders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    address text,
    date_of_birth date,
    nric_masked text NOT NULL,
    nric_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    provider text NOT NULL,
    category text NOT NULL,
    fee numeric(12,2) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT courses_fee_check CHECK ((fee >= (0)::numeric)),
    CONSTRAINT courses_status_check CHECK ((status = ANY (ARRAY['active'::text, 'upcoming'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: education_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.education_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_holder_id uuid NOT NULL,
    account_number text NOT NULL,
    balance numeric(12,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    suspended_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT education_accounts_balance_check CHECK ((balance >= (0)::numeric)),
    CONSTRAINT education_accounts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'closed'::text])))
);


--
-- Name: enrolments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrolments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    education_account_id uuid NOT NULL,
    course_id uuid NOT NULL,
    status text DEFAULT 'enrolled'::text NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    amount_paid numeric(12,2) DEFAULT 0 NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT enrolments_payment_status_check CHECK ((payment_status = ANY (ARRAY['paid'::text, 'pending'::text, 'partial'::text, 'refunded'::text]))),
    CONSTRAINT enrolments_status_check CHECK ((status = ANY (ARRAY['enrolled'::text, 'completed'::text, 'withdrawn'::text, 'pending_payment'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    first_name text,
    last_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    education_account_id uuid NOT NULL,
    type text NOT NULL,
    amount numeric(12,2) NOT NULL,
    balance_after numeric(12,2) NOT NULL,
    internal_description text,
    external_description text,
    reference_id text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['top_up'::text, 'fee_charge'::text, 'refund'::text, 'adjustment'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: account_holders account_holders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_holders
    ADD CONSTRAINT account_holders_pkey PRIMARY KEY (id);


--
-- Name: account_holders account_holders_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_holders
    ADD CONSTRAINT account_holders_user_id_key UNIQUE (user_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: education_accounts education_accounts_account_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.education_accounts
    ADD CONSTRAINT education_accounts_account_number_key UNIQUE (account_number);


--
-- Name: education_accounts education_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.education_accounts
    ADD CONSTRAINT education_accounts_pkey PRIMARY KEY (id);


--
-- Name: enrolments enrolments_education_account_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrolments
    ADD CONSTRAINT enrolments_education_account_id_course_id_key UNIQUE (education_account_id, course_id);


--
-- Name: enrolments enrolments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrolments
    ADD CONSTRAINT enrolments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: account_holders update_account_holders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_account_holders_updated_at BEFORE UPDATE ON public.account_holders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: courses update_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: education_accounts update_education_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_education_accounts_updated_at BEFORE UPDATE ON public.education_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: enrolments update_enrolments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_enrolments_updated_at BEFORE UPDATE ON public.enrolments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: account_holders account_holders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_holders
    ADD CONSTRAINT account_holders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: education_accounts education_accounts_account_holder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.education_accounts
    ADD CONSTRAINT education_accounts_account_holder_id_fkey FOREIGN KEY (account_holder_id) REFERENCES public.account_holders(id) ON DELETE CASCADE;


--
-- Name: enrolments enrolments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrolments
    ADD CONSTRAINT enrolments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: enrolments enrolments_education_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrolments
    ADD CONSTRAINT enrolments_education_account_id_fkey FOREIGN KEY (education_account_id) REFERENCES public.education_accounts(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: transactions transactions_education_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_education_account_id_fkey FOREIGN KEY (education_account_id) REFERENCES public.education_accounts(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: transactions Admins can create transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: account_holders Admins can manage account holders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage account holders" ON public.account_holders TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: courses Admins can manage courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage courses" ON public.courses TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: education_accounts Admins can manage education accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage education accounts" ON public.education_accounts TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: enrolments Admins can manage enrolments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage enrolments" ON public.enrolments TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: account_holders Admins can view all account holders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all account holders" ON public.account_holders FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: education_accounts Admins can view all education accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all education accounts" ON public.education_accounts FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: enrolments Admins can view all enrolments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all enrolments" ON public.enrolments FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: transactions Admins can view all transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: audit_logs Admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: audit_logs Authenticated users can create audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: courses Authenticated users can view courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view courses" ON public.courses FOR SELECT TO authenticated USING (true);


--
-- Name: account_holders Citizens can view their own account holder info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Citizens can view their own account holder info" ON public.account_holders FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: education_accounts Citizens can view their own education account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Citizens can view their own education account" ON public.education_accounts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.account_holders ah
  WHERE ((ah.id = education_accounts.account_holder_id) AND (ah.user_id = auth.uid())))));


--
-- Name: enrolments Citizens can view their own enrolments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Citizens can view their own enrolments" ON public.enrolments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.education_accounts ea
     JOIN public.account_holders ah ON ((ah.id = ea.account_holder_id)))
  WHERE ((ea.id = enrolments.education_account_id) AND (ah.user_id = auth.uid())))));


--
-- Name: transactions Citizens can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Citizens can view their own transactions" ON public.transactions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.education_accounts ea
     JOIN public.account_holders ah ON ((ah.id = ea.account_holder_id)))
  WHERE ((ea.id = transactions.education_account_id) AND (ah.user_id = auth.uid())))));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: account_holders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_holders ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: education_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.education_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: enrolments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enrolments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;