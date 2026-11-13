/** Pruebas de COMPONENTE: lista de requisitos de contraseña (RN-11). */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordRequirements } from '../src/features/auth/components/PasswordRequirements';

const met = () => screen.queryAllByText(': cumplido').length;

describe('TC-WEB-PWD: lista de requisitos de contraseña', () => {
  it('TC-WEB-PWD-01 muestra los 5 requisitos, todos pendientes con el campo vacío', () => {
    render(<PasswordRequirements password="" />);

    expect(screen.getByText(/Al menos 10 caracteres/)).toBeInTheDocument();
    expect(screen.getByText(/Una letra minúscula/)).toBeInTheDocument();
    expect(screen.getByText(/Una letra mayúscula/)).toBeInTheDocument();
    expect(screen.getByText(/Un número/)).toBeInTheDocument();
    expect(screen.getByText(/Un carácter especial/)).toBeInTheDocument();
    expect(met()).toBe(0);
    expect(screen.getAllByText(': pendiente')).toHaveLength(5);
  });

  it.each([
    ['TC-WEB-PWD-02', 'abc', 1],
    ['TC-WEB-PWD-03', 'Abc1', 3],
    ['TC-WEB-PWD-04', 'Abc1!', 4],
    ['TC-WEB-PWD-05', 'Abcdef123!', 5],
  ])('%s con %j se cumplen %i requisitos', (_id, password, expected) => {
    render(<PasswordRequirements password={password} />);

    expect(met()).toBe(expected);
  });

  it('TC-WEB-PWD-06 el estado de cada requisito también se anuncia en texto (lectores de pantalla)', () => {
    render(<PasswordRequirements password="abc" />);

    expect(screen.getByText(/Una letra minúscula/).textContent).toContain('cumplido');
  });
});
