"""RBAC em memória: usuários mock, login e concessão/revogação de papéis."""

from __future__ import annotations

from api.rbac.models import ROLE_HIERARCHY, Role, User, UserStore

# Usuários de teste do mock (senha "test" para todos)
DEFAULT_USERS: dict[str, dict[str, str]] = {
    "u-operador": {
        "email": "operador@test.com",
        "name": "Operador Teste",
        "role": Role.OPERADOR,
        "password": "test",
    },
    "u-admin": {
        "email": "admin@test.com",
        "name": "Admin Teste",
        "role": Role.ADMIN,
        "password": "test",
    },
    "u-super": {
        "email": "super@test.com",
        "name": "Super Admin Teste",
        "role": Role.SUPER_ADMIN,
        "password": "test",
    },
}


class RBACService:
    """Gerencia usuários e regras de hierarquia (operador < admin < super_admin)."""

    def __init__(self) -> None:
        self._passwords: dict[str, str] = {}
        self.store = UserStore(
            users={
                uid: User(id=uid, email=data["email"], name=data["name"], role=data["role"])
                for uid, data in DEFAULT_USERS.items()
            }
        )
        for uid, data in DEFAULT_USERS.items():
            self._passwords[data["email"]] = data["password"]

    def authenticate(self, email: str, password: str) -> User | None:
        """Valida credenciais mock"""
        if self._passwords.get(email) != password:
            return None
        for user in self.store.users.values():
            if user.email == email:
                return user
        return None

    def get_user(self, user_id: str) -> User | None:
        """Busca usuário pelo id"""
        return self.store.users.get(user_id)

    def get_user_by_email(self, email: str) -> User | None:
        for user in self.store.users.values():
            if user.email == email:
                return user
        return None

    def list_users(self) -> list[User]:
        """Lista todos os usuários"""
        return list(self.store.users.values())

    def can_grant_role(self, actor: User, target_role: Role) -> bool:
        """True se o ator pode atribuir"""
        return ROLE_HIERARCHY[actor.role] > ROLE_HIERARCHY[target_role]

    def grant_role(self, actor: User, user_id: str, role: Role) -> User:
        """Atribui ``role`` ao usuário; falha se houver escalada de privilégio."""
        if not self.can_grant_role(actor, role):
            raise PermissionError("Privilege escalation not allowed")
        user = self.store.users.get(user_id)
        if user is None:
            raise KeyError(f"User {user_id} not found")
        updated = user.model_copy(update={"role": role})
        self.store.users[user_id] = updated
        return updated

    def revoke_role(self, actor: User, user_id: str) -> User:
        """Rebaixa o usuário para ``operador``"""
        user = self.store.users.get(user_id)
        if user is None:
            raise KeyError(f"User {user_id} not found")
        if not self.can_grant_role(actor, user.role):
            raise PermissionError("Cannot revoke role at or above your level")
        updated = user.model_copy(update={"role": Role.OPERADOR})
        self.store.users[user_id] = updated
        return updated


rbac_service = RBACService()
