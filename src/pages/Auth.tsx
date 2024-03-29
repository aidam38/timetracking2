import axios from "axios";
import { Link, Outlet, useLocation, useNavigate } from "solid-app-router";
import {
  Accessor,
  Component,
  createEffect,
  createSignal,
  Show
} from "solid-js";

function hash(s: string): number {
  var hash: number = 0;
  for (var i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
  }
  return hash;
}

function hashPassword(password: string): string {
  return hash(password).toString(16);
}

type CredentialsFormProps = {
  onSubmit: (username: string, password: string) => void;
  submitLabel: string;
  clear: Accessor<boolean>;
};

const CredentialsForm: Component<CredentialsFormProps> = ({
  onSubmit,
  submitLabel,
  clear,
}) => {
  let usernameEl, passwordEl;

  createEffect(() => {
    if (clear()) {
      usernameEl.value = "";
      passwordEl.value = "";
    }
  });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(usernameEl.value, passwordEl.value);
      }}
      class="flex flex-col border-2 border-black rounded w-96 p-4"
    >
      <div class="flex">
        <label class="w-24">Username: </label>
        <input type="text" ref={usernameEl} class="border px-1" />
      </div>
      <div class="h-1"></div>
      <div class="flex">
        <label class="w-24">Password: </label>
        <input type="password" ref={passwordEl} class="border px-1" />
      </div>
      <div class="h-2"></div>
      <div>
        <button
          type="submit"
          class="border border-black rounded px-2 py-1 hover:bg-gray-100"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

export const Signup: Component = () => {
  const navigate = useNavigate();

  const signup = async (username: string, password: string) => {
    const credentials = {
      username: username,
      hashedPassword: hashPassword(password),
    };
    const res = await axios.post("/api/signup", null, {
      params: credentials,
    });

    if (res.data === "ok") {
      localStorage.setItem("user", JSON.stringify({ credentials }));
      navigate("/track");
    }
  };
  return (
    <>
      <CredentialsForm
        onSubmit={signup}
        submitLabel="Sign up"
        clear={() => true}
      />
      <div class="h-1" />
      Already have an account?{" "}
      <Link href="/login" class="hover:underline">
        Log in instead.
      </Link>
    </>
  );
};

export const Login: Component = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [invalid, setInvalid] = createSignal(false);

  const login = async (username: string, password: string) => {
    setInvalid(false);

    const credentials = {
      username: username,
      hashedPassword: hashPassword(password),
    };

    const res = await axios.get("/api/login", {
      params: credentials,
    });

    if (res.data == "ok") {
      localStorage.setItem("user", JSON.stringify({ credentials }));

      navigate((location.state as any)?.redirect || "/track");
    } else if (res.data == "username+password not found") {
      setInvalid(true);
    }
  };

  return (
    <>
      <CredentialsForm onSubmit={login} submitLabel="Log in" clear={invalid} />
      <Show when={invalid()}>Invalid username and password.</Show>
      <div class="h-1" />
      Don't have an account?{" "}
      <Link href="/signup" class="hover:underline">
        Sign up instead.
      </Link>
    </>
  );
};

export const Auth: Component = () => {
  return (
    <div class="pl-12 pt-12">
      <Outlet />
    </div>
  );
};
