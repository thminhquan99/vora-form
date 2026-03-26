import { FormStore } from '../ref-store';

describe('FormStore — registerField & getValue', () => {
  it('registers a native input element and seeds its value into the values Map', () => {
    const store = new FormStore();
    const input = document.createElement('input');
    input.value = 'hello';
    store.registerField('testField', input as any);
    expect(store.getValue('testField')).toBe('hello');
  });

  it('does not overwrite an existing value when re-registering the same path', () => {
    const store = new FormStore();
    const input1 = document.createElement('input');
    input1.value = 'first';
    store.registerField('testField', input1 as any);
    expect(store.getValue('testField')).toBe('first');

    const input2 = document.createElement('input');
    input2.value = 'second';
    store.registerField('testField', input2 as any);
    // Preserves 'first' instead of overwriting with 'second'
    expect(store.getValue('testField')).toBe('first');
  });

  it('unregisterField removes the ref but preserves the value in the values Map', () => {
    const store = new FormStore();
    const input = document.createElement('input');
    input.value = 'keepme';
    store.registerField('testField', input as any);
    store.unregisterField('testField');
    
    // The ref should be gone (getAllValues will ignore it), but internal getValue should still retrieve it
    expect(store.getValue('testField')).toBe('keepme');
  });

  it('purgeField completely removes field from the store', () => {
    const store = new FormStore();
    const input = document.createElement('input');
    input.value = 'gone';
    store.registerField('testField', input as any);
    store.setError('testField', 'error');
    store.setTouched('testField');

    store.purgeField('testField');
    
    expect(store.getValue('testField')).toBeUndefined();
    expect(store.getError('testField')).toBeUndefined();
    expect(store.isTouched('testField')).toBe(false);
    expect(store.fieldCount).toBe(0);
  });
});

describe('FormStore — setValue & getSilentValue', () => {
  it('setValue updates the values Map and notifies "value" subscribers', () => {
    const store = new FormStore();
    const mockListener = jest.fn();
    store.subscribe('testField', mockListener, 'value');
    
    store.setValue('testField', 'new-val');
    expect(store.getValue('testField')).toBe('new-val');
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  it("setValue syncs to the DOM element's .value for native inputs", () => {
    const store = new FormStore();
    const input = document.createElement('input');
    store.registerField('testField', input as any);
    
    store.setValue('testField', 'magic');
    expect(input.value).toBe('magic');
  });

  it('setSilentValue updates the values Map without notifying "value" subscribers', () => {
    const store = new FormStore();
    const mockListener = jest.fn();
    store.subscribe('testField', mockListener, 'value');
    
    store.setSilentValue('testField', 'ninja');
    expect(store.getValue('testField')).toBe('ninja');
    expect(mockListener).not.toHaveBeenCalled();
  });

  it('setSilentValue notifies "input" subscribers', () => {
    const store = new FormStore();
    const mockListener = jest.fn();
    store.subscribe('testField', mockListener, 'input');
    
    store.setSilentValue('testField', 'ninja');
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  it('setSilentValue auto-clears an existing error for that path', () => {
    const store = new FormStore();
    const mockErrorListener = jest.fn();
    store.setError('testField', 'bad error');
    store.subscribe('testField', mockErrorListener, 'error');
    
    store.setSilentValue('testField', 'fixed');
    expect(store.getError('testField')).toBeUndefined();
    expect(mockErrorListener).toHaveBeenCalled();
  });

  it('setValue skips notification if values are economically equal (deep equal)', () => {
    const store = new FormStore();
    const mockListener = jest.fn();
    store.setValue('testField', { a: 1 });
    store.subscribe('testField', mockListener, 'value');
    
    // Set identical object structure
    store.setValue('testField', { a: 1 });
    expect(mockListener).not.toHaveBeenCalled();
    
    // Set different value
    store.setValue('testField', { a: 2 });
    expect(mockListener).toHaveBeenCalledTimes(1);
  });
});

describe('FormStore — getAllValues', () => {
  it('only returns values for currently mounted fields (those with an active ref)', () => {
    const store = new FormStore();
    const inputA = document.createElement('input');
    inputA.value = 'mounted';
    store.registerField('fieldA', inputA as any);
    
    // Register and then unregister fieldB
    const inputB = document.createElement('input');
    inputB.value = 'unmounted';
    store.registerField('fieldB', inputB as any);
    store.unregisterField('fieldB');

    const allValues = store.getAllValues();
    expect(allValues).toEqual({
      fieldA: 'mounted'
    });
  });

  it('does not return values for unregistered (unmounted) fields', () => {
    const store = new FormStore();
    // Simulate a value artificially existing without a hook/ref mounted
    store.setSilentValue('orphan', 'hidden'); 
    expect(store.getAllValues()).toEqual({});
  });

  it('unflattens dot notation when requested', () => {
    const store = new FormStore();
    const input1 = document.createElement('input');
    const input2 = document.createElement('input');
    store.registerField('user.firstName', input1 as any);
    store.registerField('user.lastName', input2 as any);
    store.setValue('user.firstName', 'John');
    store.setValue('user.lastName', 'Doe');

    const values = store.getAllValues({ unflatten: true });
    expect(values).toEqual({
      user: {
        firstName: 'John',
        lastName: 'Doe'
      }
    });
  });
});

describe('FormStore — validateInternal', () => {
  it('returns true when no rules are registered', () => {
    const store = new FormStore();
    expect(store.validateInternal()).toBe(true);
  });

  it('returns false and sets error when a required rule fails', () => {
    const store = new FormStore();
    const input = document.createElement('input');
    input.value = '';
    store.registerField('field', input as any);
    store.registerRule('field', (val) => (!val ? 'Required field' : undefined));
    
    const isValid = store.validateInternal();
    expect(isValid).toBe(false);
    expect(store.getError('field')).toBe('Required field');
  });

  it('skips Promise return values from rules (does not set "[object Promise]" as error)', () => {
    const store = new FormStore();
    const input = document.createElement('input');
    store.registerField('field', input as any);
    store.registerRule('field', (_val) => Promise.resolve('Error') as any);
    
    const isValid = store.validateInternal();
    // Silently ignores the Promise
    expect(isValid).toBe(true);
    expect(store.getError('field')).toBeUndefined();
  });

  it('handles empty object {} as invalid for required rule', () => {
    const store = new FormStore();
    const input = document.createElement('input');
    store.registerField('field', input as any);
    store.setValue('field', {});
    
    // Inject the internal useVoraField rule logic handling objects natively
    store.registerRule('field', (val) => {
      const isEmptyObject =
        val !== null &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        Object.keys(val).length === 0;

      if (val === undefined || val === null || val === '' || isEmptyObject) {
         return 'Required Object Field';
      }
      return undefined;
    });

    const isValid = store.validateInternal();
    expect(isValid).toBe(false);
    expect(store.getError('field')).toBe('Required Object Field');
  });
});

describe('FormStore — error management', () => {
  it('setError sets error and notifies "error" subscribers', () => {
    const store = new FormStore();
    const mockListener = jest.fn();
    store.subscribe('field', mockListener, 'error');
    
    store.setError('field', 'bad input');
    expect(store.getError('field')).toBe('bad input');
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  it('clearError removes the error and notifies "error" subscribers', () => {
    const store = new FormStore();
    store.setError('field', 'bad input');
    
    const mockListener = jest.fn();
    store.subscribe('field', mockListener, 'error');
    
    store.clearError('field');
    expect(store.getError('field')).toBeUndefined();
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  it("clearAllErrors clears all errors and notifies each path's subscribers", () => {
    const store = new FormStore();
    store.setError('fieldA', 'errorA');
    store.setError('fieldB', 'errorB');
    
    const listenerA = jest.fn();
    const listenerB = jest.fn();
    store.subscribe('fieldA', listenerA, 'error');
    store.subscribe('fieldB', listenerB, 'error');
    
    store.clearAllErrors();
    expect(store.getError('fieldA')).toBeUndefined();
    expect(store.getError('fieldB')).toBeUndefined();
    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it('structured errors: sync and async errors do not overwrite each other', () => {
    const store = new FormStore();
    store.setError('field', 'sync-err', 'sync');
    store.setError('field', 'async-err', 'async');
    
    expect(store.getErrorState('field')).toEqual({
      sync: 'sync-err',
      async: 'async-err'
    });
    // Priority check: sync should be returned first
    expect(store.getError('field')).toBe('sync-err');
  });

  it('structured errors: clearing sync does not clear async', () => {
    const store = new FormStore();
    store.setError('field', 'sync-err', 'sync');
    store.setError('field', 'async-err', 'async');
    
    store.clearError('field', 'sync');
    expect(store.getError('field')).toBe('async-err');
  });

  it('structured errors: clearError without type clears both', () => {
    const store = new FormStore();
    store.setError('field', 'sync-err', 'sync');
    store.setError('field', 'async-err', 'async');
    
    store.clearError('field');
    expect(store.getError('field')).toBeUndefined();
  });
});

describe('FormStore — pub/sub', () => {
  it('subscribe returns an unsubscribe function that stops notifications', () => {
    const store = new FormStore();
    const mockListener = jest.fn();
    const unsubscribe = store.subscribe('field', mockListener, 'value');
    
    store.setValue('field', 'one');
    expect(mockListener).toHaveBeenCalledTimes(1);
    
    unsubscribe();
    store.setValue('field', 'two');
    expect(mockListener).toHaveBeenCalledTimes(1); 
  });

  it('listeners for path A are not called when path B changes', () => {
    const store = new FormStore();
    const listenerA = jest.fn();
    const listenerB = jest.fn();
    
    store.subscribe('pathA', listenerA, 'value');
    store.subscribe('pathB', listenerB, 'value');
    
    store.setValue('pathA', 'test');
    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).not.toHaveBeenCalled();
  });
});

describe('FormStore — touched & dirty', () => {
  it('setTouched marks a field as touched and notifies "touched" subscribers', () => {
    const store = new FormStore();
    const mockListener = jest.fn();
    store.subscribe('field', mockListener, 'touched');
    
    expect(store.isTouched('field')).toBe(false);
    store.setTouched('field');
    expect(store.isTouched('field')).toBe(true);
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  it('setTouched does not notify again if already touched', () => {
    const store = new FormStore();
    store.setTouched('field');
    
    const mockListener = jest.fn();
    store.subscribe('field', mockListener, 'touched');
    
    store.setTouched('field');
    expect(mockListener).not.toHaveBeenCalled();
  });

  it('getDirtyValues returns only fields whose value differs from initialValues', () => {
    const store = new FormStore({
      cleanField: 'clean',
      dirtyField: 'clean'
    });
    
    const inputClean = document.createElement('input');
    const inputDirty = document.createElement('input');
    store.registerField('cleanField', inputClean as any);
    store.registerField('dirtyField', inputDirty as any);
    
    store.setValue('cleanField', 'clean');  // no change
    store.setValue('dirtyField', 'dirty');  // changed
    
    const dirtyValues = store.getDirtyValues();
    expect(dirtyValues).toEqual({
      dirtyField: 'dirty'
    });
  });
});
