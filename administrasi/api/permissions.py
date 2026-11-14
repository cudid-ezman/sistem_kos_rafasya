from rest_framework.permissions import BasePermission

class IsPengurus(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return (hasattr(user, 'profiluser') and user.profiluser.role == 'pengurus') or user.is_superuser

class IsPemilik(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return (hasattr(user, 'profiluser') and user.profiluser.role == 'pemilik') or user.is_superuser